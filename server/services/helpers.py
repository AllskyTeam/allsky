import os
import json
import cv2
import numpy as np
from typing import Dict, Tuple, Optional
from pathlib import Path
from typing import Dict

SERVER_SETTINGS_FILE = Path(os.environ.get('ALLSKY_CONFIG', '~')) / 'server.json'

def get_camera_image_details(image_name:str = 'image.png') -> tuple[str, str]:
    base_dir = Path(__file__).resolve().parent.parent
    base_image_path = base_dir / "assets" / "camera-images"
    base_image_path.mkdir(parents=True, exist_ok=True)
    image_path = base_image_path / image_name
        
    image_url = f"/assets/camera-images/{image_name}"
    
    return image_path, image_url

def load_module_config(module:str='') -> Dict:
    if SERVER_SETTINGS_FILE.exists():
        data = json.loads(SERVER_SETTINGS_FILE.read_text())
    else:
        data = {
            "focuser": {
                "type": "uln2003",
                "profile": "custom",
                "steps": {"fast": 500, "slow": 50},
                "pins": {"in1": 20, "in2": 21, "in3": 26, "in4": 19}
            }
        }

    return data.get(module, {}) if module else data

def save_module_config(module:str, data:Dict) -> bool:
    settings = load_module_config(module)

    settings[module] = data

    SERVER_SETTINGS_FILE.write_text(json.dumps(settings, indent=2))
    
    return True

#
# Focus calculations
#
def _to_gray(img: np.ndarray) -> np.ndarray:
    if img.ndim == 2:
        g = img
    else:
        g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return g.astype(np.float32)

def _crop_roi(img: np.ndarray, roi: Optional[Tuple[int,int,int,int]]) -> np.ndarray:
    if roi is None:
        return img
    x, y, w, h = roi
    return img[y:y+h, x:x+w]

def _apply_mask(img: np.ndarray, mask: Optional[np.ndarray]) -> np.ndarray:
    if mask is None:
        return img
    # ensure mask is 0/1 float, same size
    m = mask.astype(np.float32)
    if m.max() > 1.0: m = (m > 0).astype(np.float32)
    return img * m

def focus_measures(
    image: np.ndarray,
    roi: Optional[Tuple[int,int,int,int]] = None,
    mask: Optional[np.ndarray] = None,
    denoise_sigma: float = 0.0,
) -> Dict[str, float]:
    """
    Compute several focus/sharpness metrics.

    Parameters
    ----------
    image : np.ndarray
        Grayscale or BGR image.
    roi : (x, y, w, h) or None
        Optional region of interest to evaluate.
    mask : np.ndarray or None
        Optional binary mask (same size as ROI) to include only certain pixels.
    denoise_sigma : float
        If >0, applies a small Gaussian blur (sigma) before measuring to reduce noise sensitivity.

    Returns
    -------
    dict with keys:
      'var_laplacian'  : Variance of Laplacian (classic focus metric)
      'tenengrad'      : Mean squared Sobel gradient magnitude
      'brenner'        : Brenner gradient
      'sml'            : Sum of Modified Laplacian
      'hf_energy'      : High-frequency energy (FFT band)
      'contrast'       : Normalized RMS contrast
      'composite'      : Weighted composite (0..1 per-image normalization)
    """
    g = _to_gray(image)
    g = _crop_roi(g, roi)
    if denoise_sigma > 0:
        k = max(3, int(denoise_sigma * 6) | 1)
        g = cv2.GaussianBlur(g, (k, k), denoise_sigma)
    if mask is not None and roi is not None:
        mask = mask[roi[1]:roi[1]+roi[3], roi[0]:roi[0]+roi[2]]
    g = _apply_mask(g, mask)

    # 1) Variance of Laplacian
    lap = cv2.Laplacian(g, ddepth=cv2.CV_32F, ksize=3)
    var_laplacian = float(lap.var())

    # 2) Tenengrad (Sobel gradient magnitude squared, mean)
    gx = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)
    tenengrad = float((gx*gx + gy*gy).mean())

    # 3) Brenner gradient (simple 2-px difference)
    shift2 = np.zeros_like(g)
    shift2[:, :-2] = g[:, 2:]
    brenner = float(((shift2 - g) ** 2).mean())

    # 4) Sum of Modified Laplacian (SML)
    # (|d2/dx2| + |d2/dy2| using 1D second-derivative kernels)
    k2 = np.array([1, -2, 1], dtype=np.float32)
    dxx = cv2.filter2D(g, -1, k2.reshape(1, 3))
    dyy = cv2.filter2D(g, -1, k2.reshape(3, 1))
    sml = float((np.abs(dxx) + np.abs(dyy)).mean())

    # 5) High-frequency energy via FFT (exclude very low radius)
    # pad to next power of 2 for speed
    h, w = g.shape
    H = 1 << (h - 1).bit_length()
    W = 1 << (w - 1).bit_length()
    gp = np.zeros((H, W), np.float32); gp[:h, :w] = g
    G = np.fft.fftshift(np.fft.fft2(gp))
    mag = np.abs(G)
    yy, xx = np.indices(mag.shape)
    cy, cx = H//2, W//2
    r = np.hypot(yy - cy, xx - cx)
    r_norm = r / r.max()
    # keep band outside radius 0.1 (remove DC/low) up to 0.5
    band = (r_norm > 0.10) & (r_norm < 0.50)
    hf_energy = float((mag[band] ** 2).mean())

    # 6) Normalized RMS contrast
    g_norm = (g - g.mean()) / (g.std() + 1e-8)
    contrast = float(g_norm.std())  # == 1.0 typically if not masked; still useful with mask

    # Build a composite (per-image scaled to 0..1 using robust min/max)
    vals = np.array([var_laplacian, tenengrad, brenner, sml, hf_energy, contrast], dtype=np.float64)
    # Robust scaling to reduce outlier effects across frames
    eps = 1e-12
    vmin, vmax = np.percentile(vals, 5), np.percentile(vals, 95)
    composite = float(np.clip((vals - vmin) / (vmax - vmin + eps), 0, 1).mean())

    return {
        "var_laplacian": var_laplacian,
        "tenengrad": tenengrad,
        "brenner": brenner,
        "sml": sml,
        "hf_energy": hf_energy,
        "contrast": contrast,
        "composite": composite,
    }

def focus_score_laplacian(img_gray: np.ndarray, denoise_sigma=0.5) -> float:
    g = img_gray.astype(np.float32)
    if denoise_sigma and denoise_sigma > 0:
        k = max(3, int(denoise_sigma * 6) | 1)
        g = cv2.GaussianBlur(g, (k, k), denoise_sigma)
    lap = cv2.Laplacian(g, cv2.CV_32F, ksize=3)
    return float(lap.var())


import numpy as np
import cv2

def _to_gray_f32(img: np.ndarray) -> np.ndarray:
    """Return 2D grayscale float32 in [0, 1] regardless of input dtype/channels."""
    if img.ndim == 3:
        if img.shape[2] == 3:
            g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:  # 4 channels, assume BGRA
            g = cv2.cvtColor(img, cv2.COLOR_BGRA2GRAY)
    elif img.ndim == 2:
        g = img
    else:
        raise ValueError(f"Unsupported image shape {img.shape}")
    # normalize by dtype
    if g.dtype == np.uint16:
        g = g.astype(np.float32) / 65535.0
    else:
        g = g.astype(np.float32) / 255.0 if g.dtype == np.uint8 else g.astype(np.float32)
    return g

def _extract_star_roi(gray: np.ndarray, win: int = 31, sat_frac: float = 0.98) -> np.ndarray:
    """Pick a win×win ROI around the brightest unsaturated pixel."""
    H, W = gray.shape
    # avoid borders
    pad = win // 2
    core = gray[pad:H-pad, pad:W-pad]
    # avoid saturated pixels
    sat_thr = sat_frac * float(core.max() if core.size else 1.0)
    mask = core < sat_thr
    if mask.any():
        idx = np.argmax(core * mask)
    else:
        idx = np.argmax(core)  # fall back if everything is "saturated"
    y, x = np.divmod(idx, core.shape[1])
    y += pad; x += pad
    return gray[y-pad:y+pad+1, x-pad:x+pad+1]

def star_size_fwhm_proxy(image_or_roi: np.ndarray, roi_win: int | None = None) -> float:
    """
    If roi_win is None, image_or_roi must be a small ROI (2D).
    If roi_win is an int, a ROI of that size is auto-selected from the full image.
    Returns an FWHM-like star size in pixels (smaller is sharper). NaN on failure.
    """
    g = _to_gray_f32(image_or_roi)

    # Auto-ROI if requested
    if roi_win is not None:
        if g.shape[0] < roi_win or g.shape[1] < roi_win:
            return 0
        g = _extract_star_roi(g, win=roi_win)

    if g.ndim != 2 or g.size == 0:
        return 0

    # subtract background
    bg = float(np.median(g))
    gg = np.clip(g - bg, 0, None)
    total = float(gg.sum())
    if total <= 1e-9:
        return 0

    ys, xs = np.indices(gg.shape)
    cx = float((gg * xs).sum() / total)
    cy = float((gg * ys).sum() / total)
    var_x = float((gg * (xs - cx) ** 2).sum() / total)
    var_y = float((gg * (ys - cy) ** 2).sum() / total)
    sigma = np.sqrt(max(1e-12, 0.5 * (var_x + var_y)))
    return 2.355 * sigma  # Gaussian FWHM ≈ 2.355 * sigma


#
# End Focus calculations
#