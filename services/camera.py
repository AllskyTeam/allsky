import os
import time
import json
import cv2
import numpy as np
from PIL import Image
import time
from datetime import datetime
from pathlib import Path
from picamera2 import Picamera2
from services.helpers import get_camera_image_details, focus_measures, star_size_fwhm_proxy, focus_score_laplacian
import services.asi  as asi
from flask import current_app

# Map Bayer pattern -> OpenCV conversion code (to RGB)
BAYER2RGB = {
    "RGGB": cv2.COLOR_BayerRG2RGB,
    "BGGR": cv2.COLOR_BayerBG2RGB,
    "GRBG": cv2.COLOR_BayerGR2RGB,
    "GBRG": cv2.COLOR_BayerGB2RGB,
    # Old two-letter forms -> assume full tiled pattern
    "RG":   cv2.COLOR_BayerRG2RGB,
    "BG":   cv2.COLOR_BayerBG2RGB,
    "GR":   cv2.COLOR_BayerGR2RGB,
    "GB":   cv2.COLOR_BayerGB2RGB,
}

def get_asset_path(relative_path: str) -> str:
    """Return full path to an asset within /assets."""
    assets_dir = os.path.join(current_app.root_path, 'assets')
    return os.path.join(assets_dir, relative_path)

def get_available_cameras():
    init_asi()
    camera_details = {}
    try:    
        num_zwo_cameras = asi.get_num_cameras()
        print(num_zwo_cameras)
        if num_zwo_cameras > 0:
            cameras_found = asi.list_cameras()
            pos = 0
            for camera in cameras_found:
                camera_hr = camera
                camera = camera.replace(' ', '$')
                camera_details[camera] = {
                    'camera': camera,
                    'camera_hr': camera_hr,
                    'type': 'zwo',
                    'value': f'zwo*{pos}*{camera}',
                    'pos': pos
                }
                pos = pos + 1
        
        picam2 = Picamera2()
        cameras_found = picam2.global_camera_info()

        pos = 0
        for camera in cameras_found:
            camera_hr = camera["Model"]
            camera_model = camera["Model"].replace(' ', '$')
            camera_name = f'{camera["Num"]} - {camera_model}'
            camera_details[camera_name] = {
                'camera': camera["Model"],
                'camera_hr': camera_hr,                
                'type': 'pi',
                'value': f'pi*{pos}*{camera_model}',
                'pos': pos
            }
            pos = pos + 1
        picam2.close()
        
    except Exception as ex:
        print(ex)
    print(camera_details)        
    return camera_details

#
# ZWO Camera Code
#
def init_asi():
    
    lib_path = os.path.join("asi_sdk", "lib", "armv8", "libASICamera2.so")
    lib_path = get_asset_path(lib_path)
    
    candidates = [lib_path,
                  "/usr/local/lib/libASICamera2.so",
                  "/usr/lib/libASICamera2.so"]
    for lib_path in candidates:
        if lib_path:
            try:
                asi.init(lib_path)
                return
            except Exception:
                pass
    raise FileNotFoundError("Could not initialize libASICamera2.so; set lib_path.")

def debayer_to_rgb(bayer_frame: np.ndarray, pattern: str) -> np.ndarray:

    
    """
    bayer_frame: HxW np.uint8 or np.uint16 (single plane, no channels)
    pattern: 'RGGB' | 'BGGR' | 'GRBG' | 'GBRG' (or 'RG','BG','GR','GB')
    returns: HxWx3 RGB np.uint8 or np.uint16 (matches input bit depth when possible)
    """
    if bayer_frame.ndim != 2:
        raise ValueError("Expected single-plane Bayer frame (HxW).")
    pat = pattern.upper()
    if pat not in BAYER2RGB:
        raise ValueError(f"Unknown Bayer pattern: {pattern}")

    code = BAYER2RGB[pat]

    # OpenCV can handle 8-bit directly. For 16-bit, recent OpenCV also works.
    if bayer_frame.dtype == np.uint8:
        rgb = cv2.cvtColor(bayer_frame, code)
        return rgb

    if bayer_frame.dtype == np.uint16:
        try:
            # Try native 16-bit demosaic (OpenCV ≥4 supports this)
            rgb16 = cv2.cvtColor(bayer_frame, code)
            return rgb16
        except Exception:
            # Fallback: downscale to 8-bit, debayer, return 8-bit
            b8 = (bayer_frame >> 8).astype(np.uint8)   # simple 16->8 shrink
            rgb = cv2.cvtColor(b8, code)
            return rgb

    # If it’s some unexpected dtype (e.g., np.int32), convert safely
    # Normalize to 16-bit range then try again:
    f = bayer_frame.astype(np.float32)
    f -= f.min()
    if f.max() > 0:
        f /= f.max()
    b16 = (f * 65535.0).astype(np.uint16)
    try:
        return cv2.cvtColor(b16, code)
    except Exception:
        # Last resort: go to 8-bit
        b8 = (b16 >> 8).astype(np.uint8)
        return cv2.cvtColor(b8, code)

def get_zwo_image(
    cam_index: int = 0,
    exposure_us: int = 8000,      # 8 ms
    gain: int = 100,              # ASI gain units (camera-specific)
    camera_name:str='',
    wb_r: int | None = None,      # for color cams if using WB gains
    wb_b: int | None = None,
    image_type: str = "RAW8"    # "RAW16" or "RAW8"
):

    init_asi()
    num = asi.get_num_cameras()
    if num == 0:
        raise RuntimeError("No ASI cameras detected.")

    cam = asi.Camera(cam_index)
    try:
        info = cam.get_camera_property()
        is_color = bool(info.get("IsColorCam", 0))
        cam.set_image_type(asi.ASI_IMG_RAW16 if image_type.upper() == "RAW16" else asi.ASI_IMG_RAW8)
        max_w, max_h = info["MaxWidth"], info["MaxHeight"]
        cam.set_roi_format(width=max_w, height=max_h, bins=1, image_type=cam.get_image_type())

        try:
            cam.set_control_value(asi.ASI_GAIN, gain)
            cam.set_control_value(asi.ASI_EXPOSURE, exposure_us)
            cam.set_control_value(asi.ASI_WB_B, 99)
            cam.set_control_value(asi.ASI_WB_R, 50)
            cam.set_control_value(asi.ASI_GAMMA, 50)
            cam.set_control_value(asi.ASI_BRIGHTNESS, 0)
            cam.set_control_value(asi.ASI_FLIP, 0)
        except Exception:
            pass

        if is_color:
            if wb_r is not None and wb_b is not None:
                cam.set_control_value("AutoWhiteBalance", 0)
                cam.set_control_value("WB_R", wb_r)
                cam.set_control_value("WB_B", wb_b)
            else:
                # Let camera handle AWB (some models support)
                try:
                    cam.set_control_value("AutoWhiteBalance", 1)
                except Exception:
                    pass

        time.sleep(0.05)

        cam.start_exposure()

        t0 = time.time()
        while True:
            st = cam.get_exposure_status()
            if st == asi.ASI_EXP_SUCCESS:
                break
            elif st == asi.ASI_EXP_FAILED:
                raise RuntimeError("Exposure failed")
            if time.time() - t0 > (exposure_us / 1e6 * 2 + 5):
                raise TimeoutError("Exposure timeout")
            time.sleep(0.005)

        raw = cam.get_data_after_exposure()
        w, h, binning, img_type = cam.get_roi_format()

        if img_type == asi.ASI_IMG_RAW16:
            dtype = np.uint16
            bytes_per_pixel = 2
        else:
            dtype = np.uint8
            bytes_per_pixel = 1

        # Convert buffer -> ndarray
        arr = np.frombuffer(raw, dtype=dtype)
        expected = w * h

        if arr.size != expected:
            expected_from_len = len(raw) // bytes_per_pixel
            if expected_from_len != expected:
                raise ValueError(
                    f"Buffer size mismatch: got {arr.size} samples "
                    f"(len={len(raw)} bytes), expected {expected}"
                )
            arr = np.frombuffer(raw, dtype=dtype, count=expected_from_len)

        frame = arr.reshape(h, w)

        pat = 'Mono'
        if is_color:
            BAYER_NUM2STR = {0: "RGGB", 1: "BGGR", 2: "GRBG", 3: "GBRG"}
            pat = BAYER_NUM2STR.get(info.get("BayerPattern", 0), "RGGB")

            frame = debayer_to_rgb(frame, pat)

        image_path, image_url = get_camera_image_details()
        Image.fromarray(frame.astype(np.uint8)).save(image_path)
        
        image = rgba = cv2.imread(str(image_path), cv2.IMREAD_GRAYSCALE)
        focus_fwhm = star_size_fwhm_proxy(image)
        focus_score = focus_score_laplacian(image)
            
        temperature, _ = cam.get_control_value(asi.ASI_TEMPERATURE)
        gain, _ = cam.get_control_value(asi.ASI_GAIN)
        exposure, _ = cam.get_control_value(asi.ASI_EXPOSURE)
        exposure = exposure / 1_000_000.0

        exif_data = {
            "Exposure": exposure,
            "Gain": gain,
            "Temp": temperature / 10,
            "Bayer": pat            
        }
        result = 'ok'
        return result, image_url, exif_data, focus_fwhm, focus_score

    finally:
        try:
            cam.stop_exposure()
        except Exception:
            pass
        cam.close()
#
# End ZWO Camera Code
#   


#
# Pi Camera Code
#   
def get_pi_image(exposure: int, gain: float, camera_name:str='') -> bool:
    
    
    result = True
    #try:
    exposure = int(exposure)
    gain = float(gain)

    image_path, image_url = get_camera_image_details()
    
    picam2 = Picamera2()
    picam2.configure(picam2.create_still_configuration(main={"size": (4056, 3040)}))
    picam2.start()
    picam2.set_controls({
        "AeEnable": False,
        "ExposureTime": exposure,
        "AnalogueGain": gain,
    })

    # Lock/override AWB too, or set ColourGains manually
    # picam2.set_controls({"AwbEnable": False, "ColourGains": (1.8, 1.6)})

    time.sleep(0.1)

    req = picam2.capture_request()
    try:
        req.save("main", str(image_path))
        meta = req.get_metadata()
    finally:
        req.release()

    from datetime import datetime

    sensor_timestamp_ns = int(meta.get('SensorTimestamp', 0))
    try:
        from zoneinfo import ZoneInfo
        LONDON_TZ = ZoneInfo("Europe/London")
    except Exception:
        LONDON_TZ = None

    unix_time_ns = time.time_ns() - (time.monotonic_ns() - int(sensor_timestamp_ns))
    dt = datetime.fromtimestamp(unix_time_ns / 1e9, tz=LONDON_TZ) if LONDON_TZ \
         else datetime.fromtimestamp(unix_time_ns / 1e9).astimezone()

    unix_time = dt.strftime("%c")
    exposure = int(meta.get('ExposureTime', 0))
    exposure_human = format_exposure(exposure)
    
    
    image = rgba = cv2.imread(str(image_path), cv2.IMREAD_GRAYSCALE)
    focus_fwhm = star_size_fwhm_proxy(image)
    focus_score = focus_score_laplacian(image)

    exif_data = {
        #'Time': unix_time,
        'Exposure': exposure_human,
        'Focus': meta.get('FocusFoM'),
        'Temp': meta.get('SensorTemperature')
    }

    picam2.stop()
    picam2.close()

    #except Exception:
    #    try:
    #        picam2.close()
    #    except Exception as e:
    #        print(e)
    #    result = False

    return result, image_url, exif_data, focus_fwhm, focus_score

def format_exposure(value, unit="us"):
    """
    value: numeric exposure duration
    unit:  'ns' | 'us' | 'ms' | 's'   (default 'us' as used by Picamera2)
    returns a human-readable string, e.g. '1/40 s', '0.125 s', '02:03.5', '1h 02m 03s'
    """
    if value is None:
        return "—"
    scale = {"ns": 1e-9, "us": 1e-6, "ms": 1e-3, "s": 1.0}
    if unit not in scale:
        raise ValueError("unit must be one of 'ns','us','ms','s'")
    seconds = float(value) * scale[unit]
    if seconds <= 0:
        return "0 s"

    # Very long exposures: show H/M/S
    if seconds >= 3600:
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        return f"{h}h {m:02d}m {s:02d}s"
    if seconds >= 60:
        m = int(seconds // 60)
        s = seconds % 60
        return f"{m:02d}:{s:04.1f}"  # MM:SS.s

    # 1 second to under a minute: fixed seconds with ms resolution
    if seconds >= 1:
        return f"{seconds:.3f} s".rstrip("0").rstrip(".")

    # Sub-second: prefer reciprocal shutter format
    denom = round(1.0 / seconds)
    # if it's close to a clean denominator, use 1/N
    if denom >= 2 and abs(1/denom - seconds) < max(0.5/denom**2, 0.00002):
        return f"1/{int(denom)} s"

    # Otherwise, fall back to seconds with ms/µs as needed
    if seconds >= 0.1:
        return f"{seconds:.3f} s".rstrip("0").rstrip(".")
    elif seconds >= 0.001:
        return f"{seconds*1e3:.2f} ms".rstrip("0").rstrip(".")
    else:
        return f"{seconds*1e6:.0f} µs"

#
# End Pi Camera Code
#   
