#!/usr/bin/env python3
"""Work out the Allsky Website's constellation overlay settings from a night image.

Aligning the overlay by hand means guessing its size, nudging its offsets and rotation,
reloading and repeating.  This does it from the stars instead:

  1. Two bright stars in a clear night image fix the image's centre, scale and
     rotation.  The script first tries to find them itself: it matches every pair of
     bright points in the image against every pair of bright catalogue stars, and
     accepts only a clear winner.  If that fails, the user names two stars and gives
     their pixel positions.
  2. For every star brighter than magnitude 3 the script computes where it stood at the
     image's time and place, looks for it near that position and keeps it only when the
     brightest point there clearly outshines everything else, so a neighbour can't be
     mistaken for it.  With those stars it fits the lens, r = a1*t + a3*t^3
     (t = zenith angle / 90 deg), shrinking the search window as the fit improves.
  3. It then fits virtualsky's projections (polar, fisheye, ortho) to that lens over
     the visible sky and prints the overlay settings for the best one, with the error
     to expect, plus a check image.

It reads the image, Allsky's settings (location, which Websites are enabled) and the
Website configuration (current values, imageWidth), and writes the check images.  With
--update it also writes the suggested settings into the configuration of each enabled
Website, the way the WebUI does, and uploads the remote one.

Usage:
    constellation_overlay.py --image IMAGE                 # identify the stars automatically
    constellation_overlay.py --image IMAGE --list-stars    # only list the stars that were up
    constellation_overlay.py --image IMAGE --star "vega 2828 1213" --star "altair 2527 1976"
    constellation_overlay.py --image IMAGE --star1 vega --star1-at "2828 1213" --star2 altair --star2-at "2527 1976"
Options:
    --timezone ZONE    the time zone the image's file name is in, e.g. America/Chicago.
                       Default: this computer's, and if the stars don't fit that, the
                       time zone nearest to the camera's location.
    --update           write the settings into the enabled Websites' configuration
                       (and upload the remote one)
    --html             output for the WebUI helper page
    --directory DIR    where to put the check images
                       (default: ${ALLSKY_CURRENT_DIR}/constellation_overlay, in Allsky's
                       tmp folder, so it's gone after a reboot)
"""

import os
import sys

# Run inside Allsky's virtual environment, where numpy, OpenCV and SciPy live.
ALLSKY_HOME = os.environ.get("ALLSKY_HOME") or \
    os.path.realpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
_VENV = os.path.join(ALLSKY_HOME, "venv")
if os.path.isfile(os.path.join(_VENV, "bin", "python3")) and \
        os.path.realpath(sys.prefix) != os.path.realpath(_VENV):
    os.execv(os.path.join(_VENV, "bin", "python3"), [os.path.join(_VENV, "bin", "python3")] + sys.argv)

import argparse
import calendar
import datetime
import html
import json
import math
import re
import subprocess
import time

try:
    import cv2
    import numpy as np
    from scipy.optimize import least_squares
    from scipy.spatial import cKDTree
except ImportError as _ex:                       # reported after --help has had its chance
    _MISSING = str(_ex)
else:
    _MISSING = None

ME = os.path.basename(sys.argv[0])
CATALOGUE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "constellation_overlay_stars.json")
PROJECTIONS = {                                   # virtualsky's zenith-centred projections
    "fisheye": lambda z: np.sin(z / 2) / math.sin(math.pi / 4),   # equisolid (Allsky's default)
    "polar": lambda z: z / (math.pi / 2),                          # equidistant
    "ortho": lambda z: np.sin(z),
}
OVERLAY_KEYS = ("projection", "overlayWidth", "overlayHeight", "overlayOffsetLeft", "overlayOffsetTop", "az")


class Failure(Exception):
    """A problem the user can fix; reported without a traceback."""


# --- output --------------------------------------------------------------------------

class Out:
    """Collects plain-text or HTML output for the terminal or the WebUI helper."""

    def __init__(self, as_html):
        self.html = as_html

    def para(self, text):
        print(f"<p>{html.escape(text)}</p>" if self.html else text + "\n")

    def heading(self, text):
        print(f"<h4>{html.escape(text)}</h4>" if self.html else f"{text}\n{'-' * len(text)}")

    def table(self, header, rows):
        """A table; header None gives a two-column list of name / value pairs."""
        if self.html:
            print("<table class='table table-condensed' style='width:auto'>")
            if header:
                print("<tr>" + "".join(f"<th>{html.escape(str(h))}</th>" for h in header) + "</tr>")
            for r in rows:
                print("<tr>" + "".join(f"<td>{html.escape(str(c))}</td>" for c in r) + "</tr>")
            print("</table>")
        else:
            cols = ([header] if header else []) + [[str(c) for c in r] for r in rows]
            w = [max(len(r[i]) for r in cols) for i in range(len(cols[0]))]
            for n, r in enumerate(cols):
                print("  " + "  ".join(c.ljust(w[i]) for i, c in enumerate(r)).rstrip())
                if n == 0 and header:
                    print("  " + "  ".join("-" * x for x in w))
            print()

    def summary(self, text, kind="info", open_group=None):
        """One of the few lines that matter most.  The WebUI shows them above its tabs,
        so they are seen on every tab; open_group opens that group of form fields."""
        if self.html:
            print(f"<div class='helper-summary alert alert-{kind}'>{html.escape(text)}</div>")
            if open_group:
                print(f"<span data-helper-open-group='{html.escape(open_group)}'></span>")
        else:
            print(f"*** {text}\n")

    def error(self, text):
        if self.html:
            print(f"<div class='helper-summary alert alert-danger'>{html.escape(text)}</div>")
            print(f"<p class='errorMsg'>{html.escape(text)}</p>")
        else:
            print(f"ERROR: {text}", file=sys.stderr)


# --- inputs --------------------------------------------------------------------------

def _parseLatLon(value):
    m = re.fullmatch(r"\s*([+-]?\d+(?:\.\d+)?)\s*([NSEWnsew]?)\s*", str(value or ""))
    if not m:
        return None
    v = float(m.group(1))
    return -v if m.group(2).upper() in ("S", "W") else v


def _settings():
    path = os.environ.get("ALLSKY_SETTINGS_FILE") or os.path.join(ALLSKY_HOME, "config", "settings.json")
    try:
        return json.load(open(path))
    except Exception as ex:
        raise Failure(f"Unable to read Allsky's settings '{path}': {ex}")


def _location():
    st = _settings()
    lat, lon = _parseLatLon(st.get("latitude")), _parseLatLon(st.get("longitude"))
    if lat is None or lon is None:
        raise Failure("Latitude and Longitude must be set in the WebUI's Allsky Settings.")
    return lat, lon


def _nameTime(path):
    """The capture time in the image's name (image-YYYYMMDDHHMMSS.jpg): the camera's local time."""
    m = re.search(r"(\d{14})", os.path.basename(path))
    if not m:
        raise Failure(f"'{os.path.basename(path)}' has no YYYYMMDDHHMMSS time in its name. "
                      "Use an image as Allsky saved it.")
    return datetime.datetime.strptime(m.group(1), "%Y%m%d%H%M%S")


def _toUtc(local, zone):
    """UTC of a local time in a time zone (None: this computer's), as a tuple."""
    if zone is None:
        g = time.gmtime(time.mktime(local.timetuple()[:8] + (-1,)))
    else:
        from zoneinfo import ZoneInfo
        try:
            tz = ZoneInfo(zone)
        except Exception:
            raise Failure(f"Unknown time zone '{zone}'. Use a name like America/Chicago or Europe/Berlin.")
        g = local.replace(tzinfo=tz).astimezone(datetime.timezone.utc).timetuple()
    return (g.tm_year, g.tm_mon, g.tm_mday, g.tm_hour, g.tm_min, g.tm_sec)


def _zoneNear(lat, lon):
    """The time zone whose main city is nearest to the camera, from the system's time
    zone database, or None.  Right almost everywhere; near a zone border it may not be."""
    best = None
    for tab in ("/usr/share/zoneinfo/zone1970.tab", "/usr/share/zoneinfo/zone.tab"):
        try:
            lines = open(tab, encoding="utf-8").read().splitlines()
        except OSError:
            continue
        for line in lines:
            f = line.split("\t")
            if line.startswith("#") or len(f) < 3:
                continue
            m = re.fullmatch(r"([+-])(\d{2})(\d{2})(\d{2})?([+-])(\d{3})(\d{2})(\d{2})?", f[1])
            if not m:
                continue
            zlat = (int(m.group(2)) + int(m.group(3)) / 60 + int(m.group(4) or 0) / 3600) * (1 if m.group(1) == "+" else -1)
            zlon = (int(m.group(6)) + int(m.group(7)) / 60 + int(m.group(8) or 0) / 3600) * (1 if m.group(5) == "+" else -1)
            a, b = math.radians(lat), math.radians(zlat)
            d = math.acos(max(-1.0, min(1.0, math.sin(a) * math.sin(b) +
                                        math.cos(a) * math.cos(b) * math.cos(math.radians(lon - zlon)))))
            if best is None or d < best[0]:
                best = (d, f[2])
        if best:
            break
    return best[1] if best else None


def _zoneName(zone):
    return zone or f"this computer's time zone ({time.strftime('%Z')})"


def _shiftUtc(utc, hours):
    return tuple(time.gmtime(calendar.timegm(tuple(utc) + (0, 0, 0)) + round(hours * 3600))[:6])


def _websiteConfigs():
    """The Website configurations that exist: [(kind, label, path, config dict)]."""
    found = []
    for kind, env, default in (
            ("local", "ALLSKY_WEBSITE_CONFIGURATION_FILE",
             os.path.join(ALLSKY_HOME, "html", "allsky", "configuration.json")),
            ("remote", "ALLSKY_REMOTE_WEBSITE_CONFIGURATION_FILE",
             os.path.join(ALLSKY_HOME, "config", "remote_configuration.json"))):
        path = os.environ.get(env) or default
        try:
            doc = json.load(open(path))
        except Exception:
            continue
        found.append((kind, f"{kind} Website", path, doc.get("config", doc)))
    return found


def _enabled(value):
    return value is True or str(value).strip().lower() == "true"


def _updateWebsites(out, targets):
    """Write the suggested settings into each enabled Website's configuration with Allsky's
    own updateJsonFile.sh, and upload the remote one, as the WebUI does when a Website
    setting changes.  targets: [(kind, label, path, settings)]."""
    scripts = os.environ.get("ALLSKY_SCRIPTS") or os.path.join(ALLSKY_HOME, "scripts")
    allsky = _settings()
    rows = []
    for kind, label, path, st in targets:
        label = label[0].upper() + label[1:]
        if not _enabled(allsky.get(f"use{kind}website")):
            rows.append((label, "not changed: this Website isn't enabled"))
            continue
        argv = [os.path.join(scripts, "updateJsonFile.sh"), "--verbosity", "silent", f"--{kind}"]
        for k in OVERLAY_KEYS:
            argv += [f"config.{k}", k, str(st[k])]
        r = subprocess.run(argv, capture_output=True, text=True)
        if r.returncode != 0:
            rows.append((label, "NOT updated: " + (r.stderr or r.stdout).strip()))
            continue
        if kind == "local":
            rows.append((label, "updated"))
            continue
        name = os.environ.get("ALLSKY_WEBSITE_CONFIGURATION_NAME") or "configuration.json"
        r = subprocess.run([os.path.join(scripts, "upload.sh"), "--silent", "--remote-web", path,
                            str(allsky.get("remotewebsiteimagedir") or ""), name, "RemoteWebsite"],
                           capture_output=True, text=True)
        if r.returncode != 0:
            rows.append((label, "updated here, but the upload FAILED: " + (r.stderr or r.stdout).strip()))
        else:
            rows.append((label, "updated and uploaded"))
    out.heading("Website configuration")
    out.table(None, rows)
    return rows


# --- sky -----------------------------------------------------------------------------

def _siderealDeg(utc, lon):
    Y, M, D, h, mi, s = utc
    if M <= 2:
        Y -= 1
        M += 12
    A = Y // 100
    jd = (math.floor(365.25 * (Y + 4716)) + math.floor(30.6001 * (M + 1))
          + D + (h + mi / 60.0 + s / 3600.0) / 24.0 + 2 - A + A // 4 - 1524.5)
    d = jd - 2451545.0
    T = d / 36525.0
    return (280.46061837 + 360.98564736629 * d + 0.000387933 * T * T - T ** 3 / 38710000.0 + lon) % 360.0


def _altAz(ra, dec, lst, lat):
    ra, dec, lat = np.radians(ra), np.radians(dec), math.radians(lat)
    ha = math.radians(lst) - ra
    alt = np.arcsin(np.sin(dec) * math.sin(lat) + np.cos(dec) * math.cos(lat) * np.cos(ha))
    az = np.arctan2(np.sin(ha), np.cos(ha) * math.sin(lat) - np.tan(dec) * math.cos(lat))
    return np.degrees(alt), (np.degrees(az) + 180.0) % 360.0


def _catalogue(utc, lat, lon, min_alt):
    """Bright stars above min_alt at this time: (alt, az, mag, names)."""
    stars = json.load(open(CATALOGUE))["stars"]
    ra = np.array([s[0] for s in stars])
    dec = np.array([s[1] for s in stars])
    mag = np.array([s[2] for s in stars])
    names = np.array([s[3] if len(s) > 3 else "" for s in stars], dtype=object)
    ra, dec, mag, names = _addPlanets(ra, dec, mag, names, utc)
    alt, az = _altAz(ra, dec, _siderealDeg(utc, lon), lat)
    keep = alt >= min_alt
    return alt[keep], az[keep], mag[keep], names[keep]


def _addPlanets(ra, dec, mag, names, utc):
    """The bright planets at this time: they are often the brightest points in the sky,
    and a user may well click one.  Skipped if PyEphem isn't installed."""
    try:
        import ephem
    except ImportError:
        return ra, dec, mag, names
    when = ephem.Date("%04d/%02d/%02d %02d:%02d:%02d" % tuple(utc))
    extra = []
    for planet in ("Venus", "Mars", "Jupiter", "Saturn"):
        body = getattr(ephem, planet)(when)
        if body.mag <= 3.0:
            extra.append((math.degrees(body.ra), math.degrees(body.dec), body.mag, planet.lower()))
    if not extra:
        return ra, dec, mag, names
    e = list(zip(*extra))
    return (np.concatenate([ra, e[0]]), np.concatenate([dec, e[1]]), np.concatenate([mag, e[2]]),
            np.concatenate([names, np.array(e[3], dtype=object)]))


# --- lens model ----------------------------------------------------------------------

MAX_TILT = 20.0                                   # degrees the camera's axis may lean


def _tilt(alt, az, tx, ty, inverse=False):
    """Horizon (alt, az) -> (alt, az) in the frame of a camera whose axis leans tx
    degrees toward the east and ty toward the north; inverse: back again."""
    alt, az = np.asarray(alt, float), np.asarray(az, float)
    tau = math.radians(math.hypot(tx, ty))
    if tau < 1e-14:                               # small enough for the fit's finite differences
        return alt, az
    phi = math.atan2(tx, ty)
    a, z = np.radians(alt).ravel(), np.radians(az).ravel()
    v = np.stack([np.cos(a) * np.sin(z), np.cos(a) * np.cos(z), np.sin(a)])
    axis = np.array([math.sin(tau) * math.sin(phi), math.sin(tau) * math.cos(phi), math.cos(tau)])
    k = np.cross(axis, [0.0, 0.0, 1.0])
    k /= np.linalg.norm(k)                        # turning about k by tau takes the axis to the zenith
    ang = -tau if inverse else tau
    w = v * math.cos(ang) + np.cross(k[:, None], v, axis=0) * math.sin(ang) \
        + k[:, None] * (k @ v) * (1.0 - math.cos(ang))
    return (np.degrees(np.arcsin(np.clip(w[2], -1.0, 1.0))).reshape(alt.shape),
            (np.degrees(np.arctan2(w[0], w[1])) % 360.0).reshape(alt.shape))


def _tiltOf(p):
    return (p[5], p[6]) if len(p) > 5 else (0.0, 0.0)


def _project(alt, az, p, flip):
    """(alt, az) -> pixel.  p = (cx, cy, a1, a3, rot[, tilt east, tilt north]): the
    radial lens r = a1*t + a3*t^3 about the camera's axis at (cx, cy)."""
    alt, az = _tilt(alt, az, *_tiltOf(p))
    cx, cy, a1, a3, rot = p[:5]
    t = (90.0 - np.asarray(alt)) / 90.0
    r = a1 * t + a3 * t ** 3
    ang = np.radians(rot + flip * np.asarray(az))
    return cx + r * np.sin(ang), cy - r * np.cos(ang)


def _unproject(x, y, p, flip):
    """Pixel -> (alt, az) for the fitted lens; Newton on r = a1*t + a3*t^3."""
    cx, cy, a1, a3, rot = p[:5]
    dx, dy = x - cx, cy - y
    r = np.hypot(dx, dy)
    az = ((np.degrees(np.arctan2(dx, dy)) - rot) * flip) % 360.0
    t = np.clip(r / a1, 0.0, 1.5)
    for _ in range(30):
        f = a1 * t + a3 * t ** 3 - r
        fp = np.maximum(a1 + 3 * a3 * t * t, 1e-6)
        t = np.clip(t - f / fp, 0.0, 1.5)
    return _tilt(90.0 - 90.0 * t, az, *_tiltOf(p), inverse=True)


def _wideBlur(g, sigma):
    """A large Gaussian blur, computed on a reduced copy: the same result for a
    smooth background at a fraction of the time on a Pi."""
    f = max(1, int(sigma // 4))
    if f == 1:
        return cv2.GaussianBlur(g, (0, 0), sigma)
    h, w = g.shape
    small = cv2.resize(g, (max(1, w // f), max(1, h // f)), interpolation=cv2.INTER_AREA)
    small = cv2.GaussianBlur(small, (0, 0), sigma / f)
    return cv2.resize(small, (w, h), interpolation=cv2.INTER_LINEAR)


def _skyRegion(gray):
    """The part of the image that shows sky: the large bright disk, without the dark
    corners and the overlay text that usually sits on them."""
    h, w = gray.shape
    smooth = _wideBlur(gray.astype(np.float32), max(8, w / 150))
    level = 0.35 * float(np.median(smooth[h // 3:2 * h // 3, w // 3:2 * w // 3]))
    sky = (smooth > max(6.0, level)).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(sky, 8)
    if n > 1:
        sky = (lab == 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
    margin = max(3, int(w * 0.006))
    return cv2.erode(sky, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * margin + 1,) * 2)) > 0


def _starMap(gray):
    """Band-pass the image to star-sized spots; saturated stars keep their halo."""
    g = gray.astype(np.float32)
    w = g.shape[1]
    return cv2.GaussianBlur(g, (0, 0), max(2.0, w / 960)) - _wideBlur(g, max(8.0, w / 240))


_NOISE = {}


def _threshold(stars, sky):
    """How bright a star must stand out: 12 times the star map's noise over the sky,
    so it adapts to smooth moonlit images as well as grainy dark ones."""
    key = id(stars)
    if key not in _NOISE:
        v = stars[sky][::7]
        _NOISE[key] = max(3.0, 12.0 * 1.4826 * float(np.median(np.abs(v - np.median(v)))))
    return _NOISE[key]


def _brightPairs(cat, stars, sky, p, flip, radius, dominance=1.35):
    """(alt, az, x, y) for every catalogue star whose search window holds ONE clear
    winner: the brightest point there, at least `dominance` times the runner-up."""
    alt, az = cat[0], cat[1]
    H, W = stars.shape
    x, y = _project(alt, az, p, flip)
    r = int(radius)
    out = []
    for a, z, px, py in zip(alt, az, x, y):
        x0, y0, x1, y1 = int(px) - r, int(py) - r, int(px) + r + 1, int(py) + r + 1
        if x0 < 0 or y0 < 0 or x1 > W or y1 > H:
            continue
        win = stars[y0:y1, x0:x1].copy()
        win[~sky[y0:y1, x0:x1]] = -1e9
        j = np.unravel_index(np.argmax(win), win.shape)
        best = win[j]
        if best < _threshold(stars, sky):
            continue
        yy, xx = np.ogrid[:win.shape[0], :win.shape[1]]
        win[(yy - j[0]) ** 2 + (xx - j[1]) ** 2 < 36] = -1e9
        if best < dominance * max(float(win.max()), 1.0):
            continue
        out.append((a, z, x0 + j[1], y0 + j[0]))
    return np.array(out).reshape(-1, 4)


def _fitPairs(pairs, p0, flip, free_a3, free_tilt=False):
    p0 = list(p0) + [0.0, 0.0] * (len(p0) == 5)
    free = [0, 1, 2, 4] + [3] * free_a3 + [5, 6] * free_tilt

    def full(q):
        pp = list(p0)
        for i, v in zip(free, q):
            pp[i] = v
        return pp

    def resid(q):
        x, y = _project(pairs[:, 0], pairs[:, 1], full(q), flip)
        return np.concatenate([x - pairs[:, 2], y - pairs[:, 3]])
    lo = [-np.inf] * len(free)
    hi = [np.inf] * len(free)
    for j, i in enumerate(free):
        if i >= 5:
            lo[j], hi[j] = -MAX_TILT, MAX_TILT
    x0 = np.clip([p0[i] for i in free], np.array(lo) + 1e-6, np.array(hi) - 1e-6)
    return full(least_squares(resid, x0, bounds=(lo, hi), loss="soft_l1", f_scale=6.0).x)


def _refine(cat, stars, sky, p, flip, W):
    """Shrink the search window step by step; the cubic term is freed once the linear
    part has settled.  Returns (params, pairs) or (None, pairs)."""
    s = W / 3840.0
    p = list(p) + [0.0, 0.0] * (len(p) == 5)
    pairs = np.empty((0, 4))
    for it, rad in enumerate((100, 80, 62, 48, 38, 30, 24, 20)):
        pairs = _brightPairs(cat, stars, sky, p, flip, rad * s)
        if len(pairs) < 8:
            return None, pairs
        # The tilt is freed last, and only with enough stars to pin it: it trades off
        # against the centre, so it needs stars all over the sky.
        p = _fitPairs(pairs, p, flip, free_a3=(it >= 2), free_tilt=(it >= 4 and len(pairs) >= 15))
    return p, pairs


def _residuals(pairs, p, flip):
    """RMS residual in px and in degrees (each star at its own plate scale)."""
    x, y = _project(pairs[:, 0], pairs[:, 1], p, flip)
    e = np.hypot(x - pairs[:, 2], y - pairs[:, 3])
    t = (90.0 - pairs[:, 0]) / 90.0
    deg = e / np.maximum((p[2] + 3 * p[3] * t ** 2) / 90.0, 1e-6)
    return float(np.sqrt(np.mean(e ** 2))), float(np.sqrt(np.mean(deg ** 2)))


def _seed(picked, cat, flip):
    """Two identified stars fix centre, scale and rotation.  In complex numbers the
    equidistant model is a similarity, P = C + A*S with S = t*exp(i*flip*az)."""
    alt, az, _, names = cat
    S, P = [], []
    for name, x, y in picked:
        k = np.nonzero(names == name)[0]
        S.append((90.0 - alt[k[0]]) / 90.0 * np.exp(1j * math.radians(flip * az[k[0]])))
        P.append(complex(x, y))
    A = (P[0] - P[1]) / (S[0] - S[1])
    C = P[0] - A * S[0]
    return [C.real, C.imag, abs(A), 0.0, (math.degrees(np.angle(A)) + 90.0) % 360.0]


def _parseStar(text, cat):
    parts = [t for t in re.split(r"[\s,;_]+", str(text).strip()) if t]
    if len(parts) < 3:
        raise Failure(f"'{text}': give a star's name and its x and y position, e.g. 'vega 2828 1213'.")
    try:
        x, y = float(parts[-2]), float(parts[-1])
    except ValueError:
        raise Failure(f"'{text}': the last two values must be the x and y pixel position.")
    name = " ".join(parts[:-2]).lower()
    allnames = sorted(set(s[3] for s in json.load(open(CATALOGUE))["stars"] if len(s) > 3)
                      | {"venus", "mars", "jupiter", "saturn"})
    if name not in allnames:
        raise Failure(f"Unknown star '{name}'. Known stars and planets: {', '.join(allnames)}.")
    return name, x, y


def _calibrate(prep, cat, picked, tilt=(0.0, 0.0)):
    """Fit the lens from two identified stars; try both handedness.  tilt: where to
    start the camera's lean from."""
    stars, sky, W = prep["stars"], prep["sky"], prep["W"]
    if any(name not in set(cat[3]) for name, _, _ in picked):
        return None                              # not up at this time
    best = None
    for flip in (-1.0, 1.0):
        seed = _seed(picked, _tiltedCat(cat, *tilt), flip) + list(tilt)
        p, pairs = _refine(cat, stars, sky, seed, flip, W)
        if p is None:
            continue
        rms_px, rms_deg = _residuals(pairs, p, flip)
        if rms_deg < 0.75 and (best is None or len(pairs) > len(best[1])):   # a lens's scale varies; degrees don't
            best = (p, pairs, flip, rms_px, rms_deg)
    return best


# --- automatic identification --------------------------------------------------------

def _detect(gray, max_n, static=None):
    """Point sources as local brightness maxima, brightest first, as an (n, 2) array.
    A star sits on glowing sky, so a maximum only counts where the wide background is
    at least half the typical sky level.  Maxima at the same pixel in `static` (another
    image, half an hour away) are overlay text or hot pixels, not stars."""
    h, w = gray.shape
    g = gray.astype(np.float32)
    diff = cv2.GaussianBlur(g, (0, 0), 1.2) - cv2.GaussianBlur(g, (0, 0), max(3.0, w / 700))
    wide = _wideBlur(g, max(10.0, w / 150))
    sky = _skyRegion(gray)
    sky_level = float(np.median(wide[sky])) if sky.any() else float(np.median(wide))
    v = diff[sky][::7]
    noise = 1.4826 * float(np.median(np.abs(v - np.median(v)))) if len(v) else 2.0
    k = max(5, int(w / 550) | 1)
    peaks = (diff == cv2.dilate(diff, np.ones((k, k), np.uint8))) & (diff > max(4.0, min(12.0, 6 * noise))) \
        & sky & (wide > 0.5 * sky_level)
    m = max(1, int(0.012 * w))                   # the frame's edge: cut-off stars and frame lines
    peaks[:m, :] = peaks[-m:, :] = False
    peaks[:, :m] = peaks[:, -m:] = False
    ys, xs = np.nonzero(peaks)
    pts = np.column_stack([xs, ys]).astype(float)
    strength = _starMap(gray)[ys, xs]            # a bright star keeps a wider halo than a faint one
    # A star is an isolated point; the letters of the image's overlay text have several
    # similar maxima close together.  Drop points with 2 or more rivals nearby.
    if len(pts):
        tree = cKDTree(pts)
        c = diff[ys, xs]
        crowded = np.zeros(len(pts), bool)
        for i, near in enumerate(tree.query_ball_point(pts, r=max(12.0, w / 80))):
            crowded[i] = sum(1 for j in near if j != i and c[j] >= 0.4 * c[i]) >= 2
        pts, strength = pts[~crowded], strength[~crowded]
    if static is not None and len(static) and len(pts):
        d, _ = cKDTree(static).query(pts)
        keep = d > max(2.0, w / 1300)
        pts, strength = pts[keep], strength[keep]
    return pts[np.argsort(-strength)[:max_n]]


def _companion(path, minutes=30, window=20):
    """Another image of the same night, about `minutes` away, from the same folder."""
    m = re.search(r"(\d{14})", os.path.basename(path))
    folder = os.path.dirname(os.path.abspath(path))
    t0 = time.mktime(time.strptime(m.group(1), "%Y%m%d%H%M%S"))
    best = None
    try:
        names = os.listdir(folder)
    except OSError:
        return None
    for name in names:
        mm = re.fullmatch(r"[A-Za-z_-]*(\d{14})\.(jpg|jpeg|png)", name, re.I)
        if not mm:
            continue
        dt = abs(abs(time.mktime(time.strptime(mm.group(1), "%Y%m%d%H%M%S")) - t0) / 60.0 - minutes)
        if dt <= window and (best is None or dt < best[0]):
            best = (dt, os.path.join(folder, name))
    return best[1] if best else None


def _hypotheses(cat, dets, W, H, n_blobs=22, n_stars=22, keep=12):
    """Two star <-> point correspondences fix centre, scale and rotation exactly
    (P = C + A*S, see _seed).  Every pair of bright points against every pair of
    bright catalogue stars gives one guess; each is scored by how many other bright
    stars then land on a point.  Returns the best distinct guesses as
    (score, cx, cy, R, rot, flip)."""
    alt, az, mag, _ = cat
    score_sel = (mag <= 3.0) & (alt >= 12)
    pick = np.nonzero((mag <= 3.0) & (alt >= 15))[0]
    pick = pick[np.argsort(mag[pick])][:n_stars]
    blobs = dets[:n_blobs]
    thr = 0.008 * W
    # Where a point counts as "on a detection": a mask with a disc around each of the
    # 150 brightest points.  Looking a position up in it is far faster than a search.
    hitmap = np.zeros((H, W), np.uint8)
    for x, y in dets[:150]:
        cv2.circle(hitmap, (int(round(x)), int(round(y))), int(thr), 1, -1)
    hitmap = hitmap.astype(bool)
    P = blobs[:, 0] + 1j * blobs[:, 1]
    ii, jj = np.nonzero(~np.eye(len(P), dtype=bool))
    dP = P[ii] - P[jj]
    found = []
    for flip in (1.0, -1.0):
        S = (90.0 - alt[pick]) / 90.0 * np.exp(1j * np.radians(flip * az[pick]))
        Sall = (90.0 - alt[score_sel]) / 90.0 * np.exp(1j * np.radians(flip * az[score_sel]))
        for a in range(len(S)):
            for b in range(a + 1, len(S)):
                dS = S[a] - S[b]
                if abs(dS) < 0.05:
                    continue
                A = dP / dS
                R = np.abs(A)
                C = P[ii] - A * S[a]
                ok = (R > 0.15 * min(W, H)) & (R < 4.0 * max(W, H)) \
                    & (C.real > -0.2 * W) & (C.real < 1.2 * W) & (C.imag > -0.2 * H) & (C.imag < 1.2 * H)
                idx = np.nonzero(ok)[0]
                if len(idx) == 0:
                    continue
                Q = C[idx, None] + A[idx, None] * Sall[None, :]          # every guess, every star
                inside = (Q.real >= 0) & (Q.real < W - 0.5) & (Q.imag >= 0) & (Q.imag < H - 0.5)
                hits = np.zeros(Q.shape, bool)
                hits[inside] = hitmap[np.rint(Q.imag[inside]).astype(int), np.rint(Q.real[inside]).astype(int)]
                score = hits.sum(axis=1)
                for m in np.nonzero((score >= 6) & (inside.sum(axis=1) >= 6))[0]:
                    n = idx[m]
                    found.append((int(score[m]), C[n].real, C[n].imag, R[n],
                                  (math.degrees(np.angle(A[n])) + 90.0) % 360.0, flip))
    found.sort(reverse=True)
    distinct = []
    for h in found:
        if all(abs(h[1] - d[1]) > 0.02 * W or abs(h[2] - d[2]) > 0.02 * W or abs(h[3] / d[3] - 1) > 0.05
               or abs((h[4] - d[4] + 180) % 360 - 180) > 3 or h[5] != d[5] for d in distinct):
            distinct.append(h)
        if len(distinct) >= keep:
            break
    return distinct


def _prepare(gray, path):
    """Everything about the image that doesn't depend on its time."""
    H, W = gray.shape
    static = None
    comp = _companion(path)
    if comp is not None:
        other = cv2.imread(comp, cv2.IMREAD_GRAYSCALE)
        if other is not None and other.shape == gray.shape:
            static = _detect(other, 3000)
    return {"W": W, "H": H, "dets": _detect(gray, 400, static), "stars": _starMap(gray), "sky": _skyRegion(gray)}


def _identify(prep, cat, quick=False):
    """Find the stars without help.  Accepts only a clear winner: many stars, a small
    error, and no other solution that comes close.  Returns like _calibrate, or None.
    quick: fewer guesses, for trying many times of night."""
    W, H, dets, stars, sky = prep["W"], prep["H"], prep["dets"], prep["stars"], prep["sky"]
    if len(dets) < 12:
        return None
    results = []
    guesses = _hypotheses(cat, dets, W, H, n_stars=14, keep=4) if quick else _hypotheses(cat, dets, W, H)
    for _, cx, cy, R, rot, flip in guesses:
        p, pairs = _refine(cat, stars, sky, [cx, cy, R, 0.0, rot], flip, W)
        if p is None:
            continue
        rms_px, rms_deg = _residuals(pairs, p, flip)
        if rms_deg < 0.75:
            results.append((len(pairs), p, pairs, flip, rms_px, rms_deg))
    if not results:
        return None
    results.sort(key=lambda r: -r[0])
    n, p, pairs, flip, rms_px, rms_deg = results[0]
    rivals = [r for r in results[1:] if math.hypot(r[1][0] - p[0], r[1][1] - p[1]) > 0.02 * W
              or abs((r[1][4] - p[4] + 180) % 360 - 180) > 3 or r[3] != flip]
    if n < 12 or rms_deg > 0.6 or (rivals and rivals[0][0] >= 0.7 * n):
        return None
    return p, pairs, flip, rms_px, rms_deg


# --- a camera that leans ------------------------------------------------------------

# Where to start from for a camera that leans a lot: 6, 12 and 18 degrees in 8 directions.
TILT_SEEDS = [(tau * math.sin(math.radians(d)), tau * math.cos(math.radians(d)))
              for tau in (6.0, 12.0, 18.0) for d in range(0, 360, 45)]


def _tiltedCat(cat, tx, ty):
    """The catalogue as a camera leaning (tx, ty) sees it."""
    alt, az = _tilt(cat[0], cat[1], tx, ty)
    return alt, az, cat[2], cat[3]


def _leaning(prep, cat, fit):
    """The search assumes the camera points roughly straight up.  If it leans by more
    than a few degrees, that finds nothing: try the sky as seen by cameras leaning
    various ways, refine each find with the lean free, and accept a clear winner.
    fit(cat, tilt) returns like _calibrate, in the true sky.  Returns like _calibrate."""
    found = []
    for tilt in TILT_SEEDS:
        best = fit(cat, tilt)
        if _strong(best):
            found.append(best)
    if not found:
        return None
    found.sort(key=lambda b: (-len(b[1]), b[4]))
    best = found[0]
    zx, zy = _project(90.0, 0.0, best[0], best[2])
    for other in found[1:]:
        ox, oy = _project(90.0, 0.0, other[0], other[2])
        same = math.hypot(ox - zx, oy - zy) < 0.02 * prep["W"] and \
            abs((other[0][4] - best[0][4] + 180) % 360 - 180) < 3 and other[2] == best[2]
        if not same and len(other[1]) >= 0.75 * len(best[1]):
            return None                          # two different answers: don't guess
    return best


def _identifyLeaning(prep, cat, tilt):
    """_identify for the sky as a camera leaning `tilt` sees it, refined in the true sky."""
    best = _identify(prep, _tiltedCat(cat, *tilt), quick=True)
    if best is None:
        return None
    p0 = list(best[0][:5]) + [a + b for a, b in zip(tilt, _tiltOf(best[0]))]
    p, pairs = _refine(cat, prep["stars"], prep["sky"], p0, best[2], prep["W"])
    if p is None:
        return None
    rms_px, rms_deg = _residuals(pairs, p, best[2])
    return (p, pairs, best[2], rms_px, rms_deg) if rms_deg < 0.75 else None


# --- when the image's time doesn't fit ----------------------------------------------

def _strong(best):
    return best is not None and len(best[1]) >= 15 and best[4] <= 0.5


def _pick(found):
    """The best of fits made with different times: [(best, cat, zone)].  The camera's
    lean can partly make up for a wrong time, so among fits with nearly as many stars
    as the best one, take the one where the camera leans least."""
    if not found:
        return None
    n = max(len(f[0][1]) for f in found)
    return min((f for f in found if len(f[0][1]) >= 0.9 * n), key=lambda f: math.hypot(*_tiltOf(f[0][0])))


def _timeHint(utc, lat, lon, fit):
    """When nothing fits, see whether the stars would fit a few whole hours away.  A
    shifted time can't be used for the settings: turning the sky about the pole is
    almost the same as moving and turning the image, so the stars can't tell the
    exact shift.  But a clear winner says the time zone is wrong.  Returns hours or None."""
    tried = []
    for h in range(-12, 13):
        if h:
            best = fit(_catalogue(_shiftUtc(utc, h), lat, lon, min_alt=15.0))
            if best is not None:
                tried.append((h, best))
    if not tried:
        return None
    h, best = max(tried, key=lambda t: (len(t[1][1]), -t[1][4]))
    n = len(best[1])
    if not _strong(best) or any(abs(hh - h) >= 3 and len(b[1]) >= 0.75 * n for hh, b in tried):
        return None
    return h


def _reportZone(out, zone, name):
    out.summary(f"The stars fit best with the time in the image's name ({name}) read as {zone} time, the "
                f"time zone nearest to the camera's location, not in {_zoneName(None)}. If the image comes from "
                "this Pi, check the Pi's time zone.", "warning")


def _reportHint(out, hours, zone):
    out.summary(f"The stars would roughly fit if this image had been taken about {abs(hours)} hours "
             f"{'later' if hours > 0 else 'earlier'} than its name says, read in {_zoneName(zone)}. So the time zone "
             "is probably wrong: check the time zone set on the camera's Pi, or, for an image from another "
             "camera, run again with that camera's time zone (--timezone, e.g. America/Chicago).", "warning")


# --- overlay -------------------------------------------------------------------------

def _overlayFit(p, flip, sky, design_w):
    """virtualsky draws a projection centred on the zenith, turned by az; it can't
    lean.  For each projection, fit its centre, radius and rotation to the lens over
    the visible sky, weighting every point by its own plate scale so the error is in
    degrees.  Returns {name: (cx, cy, R, az, rms_deg, p95_deg, max_deg)}, with the centre
    in image pixels and R in the Website's pixels (imageWidth), and the widest zenith
    angle used."""
    H, W = sky.shape
    s = design_w / float(W)
    step = max(8, W // 160)
    ys, xs = np.mgrid[0:H:step, 0:W:step]
    xs, ys = xs.ravel().astype(float), ys.ravel().astype(float)
    keep = sky[ys.astype(int), xs.astype(int)]
    xs, ys = xs[keep], ys[keep]
    alt, az = _unproject(xs, ys, p, flip)
    keep = alt > 2.0
    xs, ys, alt, az = xs[keep], ys[keep], alt[keep], az[keep]
    if len(xs) < 50:
        raise Failure("Too little sky in the image to fit the overlay.")
    z = np.radians(90.0 - alt)
    t = (90.0 - _tilt(alt, az, *_tiltOf(p))[0]) / 90.0          # zenith angle in the camera's frame
    px_per_deg = (p[2] + 3 * p[3] * t ** 2) / 90.0
    zx, zy = (float(v) for v in _project(90.0, 0.0, p, flip))
    fits = {}
    for name, f in PROJECTIONS.items():
        k = f(z)
        R0 = float(np.dot(k, np.hypot(xs - zx, ys - zy)) / np.dot(k, k))

        def resid(q):
            a = np.radians(az - (q[3] - 180.0))
            return np.concatenate([(q[0] - q[2] * k * np.sin(a) - xs) / px_per_deg,
                                   (q[1] - q[2] * k * np.cos(a) - ys) / px_per_deg])
        q = least_squares(resid, [zx, zy, R0, (p[4] + 180.0) % 360.0]).x
        e = resid(q)
        err = np.hypot(e[:len(xs)], e[len(xs):])
        fits[name] = (float(q[0]), float(q[1]), float(q[2] * s), float(q[3] % 360.0),
                      float(np.sqrt(np.mean(err ** 2))), float(np.percentile(err, 95)), float(err.max()))
    return fits, float(np.degrees(z).max())


def _overlaySettings(fit, projection, design_w, W):
    s = design_w / float(W)
    cx, cy, R, az = fit[:4]
    return {
        "projection": projection,
        "overlayWidth": int(round(2 * R)),
        "overlayHeight": int(round(2 * R)),
        "overlayOffsetLeft": int(round(cx * s - R)),
        "overlayOffsetTop": int(round(cy * s - R)),
        "az": round(az, 1),
    }


def _overlayXY(alt, az, st, design_w, W):
    """Where virtualsky draws (alt, az) with these settings, in image pixels."""
    s = design_w / float(W)
    R = st["overlayHeight"] / 2.0
    cx, cy = st["overlayOffsetLeft"] + st["overlayWidth"] / 2.0, st["overlayOffsetTop"] + R
    a = np.radians(np.asarray(az) - (st["az"] - 180.0))
    r = R * PROJECTIONS[st["projection"]](np.radians(90.0 - np.asarray(alt)))
    return (cx - r * np.sin(a)) / s, (cy - r * np.cos(a)) / s


# --- check images --------------------------------------------------------------------

def _save(img, path):
    H, W = img.shape[:2]
    if W > 1920:
        img = cv2.resize(img, (1920, int(H * 1920 / W)), interpolation=cv2.INTER_AREA)
    cv2.imwrite(path, img, [cv2.IMWRITE_JPEG_QUALITY, 90])


def _checkImage(img, cat, p, flip, st, design_w, pairs, sky, path):
    H, W = img.shape[:2]
    k = W / 3840.0
    lw, fs = max(1, int(round(3 * k))), 1.3 * k
    alt, az, _, names = cat
    x0, y0 = _project(alt, az, p, flip)
    xv, yv = _overlayXY(alt, az, st, design_w, W) if st else (None, None)
    for i in range(len(alt)):
        if not (0 <= x0[i] < W and 0 <= y0[i] < H) or not sky[int(y0[i]), int(x0[i])]:
            continue
        c = (int(x0[i]), int(y0[i]))
        cv2.circle(img, c, int(26 * k), (0, 255, 0), lw)
        if st is not None:
            v = (int(xv[i]), int(yv[i]))
            cv2.line(img, c, v, (0, 255, 255), lw)
            cv2.drawMarker(img, v, (0, 255, 255), cv2.MARKER_CROSS, int(40 * k), lw)
        if names[i]:
            cv2.putText(img, names[i].title(), (c[0] + int(30 * k), c[1] - int(20 * k)),
                        cv2.FONT_HERSHEY_SIMPLEX, fs, (0, 255, 0), lw)
    for a, z, x, y in pairs:
        cv2.circle(img, (int(x), int(y)), int(8 * k), (255, 0, 255), lw)
    zx, zy = _project(90.0, 0.0, p, flip)                      # the zenith
    cv2.drawMarker(img, (int(zx), int(zy)), (255, 0, 255), cv2.MARKER_CROSS, int(80 * k), lw)
    legend = "green circle = where each bright star is (fit)   magenta = star found in the image"
    if st is not None:
        legend += "   yellow cross = where the overlay draws it"
    _legend(img, legend, k)
    _save(img, path)


def _used(cat, pairs):
    """For each catalogue star: was it found in the image and used in the fit?"""
    used = np.zeros(len(cat[0]), bool)
    for a, z, _, _ in pairs:
        used |= (np.abs(cat[0] - a) < 1e-6) & (np.abs(cat[1] - z) < 1e-6)
    return used


def _labelImage(img, cat, p, flip, pairs, sky, path):
    """The image with each named bright star circled and labelled, for the user to check.
    Yellow: found in the image and used in the fit.  Grey: where the fit puts a star
    that wasn't found (too low, faint, in cloud or at the lens's edge).  Stars behind
    buildings, trees or hills (outside the sky) are left out."""
    H, W = img.shape[:2]
    k = W / 3840.0
    lw = max(2, int(round(3 * k)))
    alt, az, _, names = cat
    x, y = _project(alt, az, p, flip)
    used = _used(cat, pairs)
    for i in range(len(alt)):
        if not names[i] or not (0 <= x[i] < W and 0 <= y[i] < H) or not sky[int(y[i]), int(x[i])]:
            continue
        colour = (0, 255, 255) if used[i] else (170, 170, 170)
        c = (int(x[i]), int(y[i]))
        cv2.circle(img, c, int(34 * k), colour, lw if used[i] else max(1, lw - 1))
        label = names[i].title()
        (tw, _), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 1.5 * k, lw)
        org = (c[0] + int(40 * k), c[1] - int(24 * k))
        if org[0] + tw > W:                     # near the right edge: label on the left
            org = (c[0] - int(40 * k) - tw, org[1])
        cv2.putText(img, label, org, cv2.FONT_HERSHEY_SIMPLEX, 1.5 * k, (0, 0, 0), lw + 3)
        cv2.putText(img, label, org, cv2.FONT_HERSHEY_SIMPLEX, 1.5 * k, colour, lw)
    _legend(img, "yellow = star found and used   grey = where a star should be, not found", k)
    _save(img, path)


def _legend(img, text, k):
    H = img.shape[0]
    lw, fs = max(1, int(round(3 * k))), 1.3 * k
    (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, fs, lw)
    cv2.rectangle(img, (0, H - th - int(60 * k)), (tw + int(80 * k), H), (0, 0, 0), -1)
    cv2.putText(img, text, (int(40 * k), H - int(30 * k)), cv2.FONT_HERSHEY_SIMPLEX, fs, (0, 255, 255), lw)


def _gridImage(img, path):
    """The image with a labelled pixel grid, to read star positions from."""
    H, W = img.shape[:2]
    k = W / 3840.0
    step = 100 if W <= 2000 else 200
    lw = max(1, int(round(2 * k)))
    for x in range(0, W, step):
        cv2.line(img, (x, 0), (x, H), (0, 200, 255) if x % (5 * step) == 0 else (0, 120, 160), lw)
        cv2.putText(img, str(x), (x + 4, int(40 * k) + 10), cv2.FONT_HERSHEY_SIMPLEX, 1.1 * k, (0, 255, 255), lw)
    for y in range(0, H, step):
        cv2.line(img, (0, y), (W, y), (0, 200, 255) if y % (5 * step) == 0 else (0, 120, 160), lw)
        cv2.putText(img, str(y), (4, y - 6), cv2.FONT_HERSHEY_SIMPLEX, 1.1 * k, (0, 255, 255), lw)
    _save(img, path)


# --- main ----------------------------------------------------------------------------

def _listStars(out, cat, image_name, grid_path):
    alt, az, mag, names = cat
    compass = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")
    rows = []
    for i in np.argsort(-alt):
        if names[i] and alt[i] >= 20:
            rows.append((names[i].title(), f"{alt[i]:.0f}", f"{az[i]:.0f} ({compass[int((az[i] + 22.5) % 360 // 45)]})",
                         f"{mag[i]:.1f}"))
    out.heading(f"Bright stars at least 20 degrees up at the time of {image_name}")
    if not rows:
        out.para("None - is the image's time right, and was it night?")
        return
    out.table(("Star", "Altitude (deg)", "Azimuth (deg)", "Magnitude"), rows)
    out.para("Pick two that are well apart and not too low, find them in the image and note each one's "
             "x and y position (the grid image helps). Then run again with both stars.")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--image", required=True, help="a clear night image as Allsky saved it")
    ap.add_argument("--star", action="append", default=[], metavar="'NAME X Y'",
                    help="an identified star and its pixel position; give two")
    for n in ("1", "2"):                          # the same, as separate fields for the WebUI form
        ap.add_argument(f"--star{n}", metavar="NAME", help=f"name of star {n}")
        ap.add_argument(f"--star{n}-at", metavar="'X Y'", help=f"pixel position of star {n}")
    ap.add_argument("--list-stars", action="store_true",
                    help="only list the bright stars that were up; don't try to identify them")
    ap.add_argument("--timezone", metavar="ZONE",
                    help="time zone of the image's file name, e.g. America/Chicago (default: this computer's)")
    ap.add_argument("--directory", help="where to put the check images")
    ap.add_argument("--update", action="store_true",
                    help="write the settings into the enabled Websites' configuration and upload the remote one")
    ap.add_argument("--html", action="store_true", help="HTML output for the WebUI")
    args = ap.parse_args()
    for n in ("1", "2"):
        name, at = getattr(args, f"star{n}"), getattr(args, f"star{n}_at")
        if name and at:
            args.star.append(f"{name} {at}")
        elif name or at:
            args.star.append(None)
            args.incomplete = f"Star {n} needs both its name and its position in the image."
    out = Out(args.html)
    try:
        if _MISSING:
            raise Failure(f"{_MISSING}. Run this with Allsky's Python ({_VENV}/bin/python3).")
        run(args, out)
    except Failure as ex:
        out.error(str(ex))
        sys.exit(1)


def run(args, out):
    started = time.time()
    img = cv2.imread(args.image)
    if img is None:
        raise Failure(f"Unable to read the image '{args.image}'.")
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    H, W = gray.shape
    lat, lon = _location()
    local = _nameTime(args.image)
    zones = [args.timezone or None]
    near = None if args.timezone else _zoneNear(lat, lon)
    if near and _toUtc(local, near) != _toUtc(local, None):
        zones.append(near)
    utc = _toUtc(local, zones[0])
    cat = _catalogue(utc, lat, lon, min_alt=15.0)
    used = zones[0]
    current = os.environ.get("ALLSKY_CURRENT_DIR") or os.path.join(
        os.environ.get("ALLSKY_TMP") or os.path.join(ALLSKY_HOME, "tmp"), "current_images")
    outdir = args.directory or os.path.join(current, "constellation_overlay")
    os.makedirs(outdir, exist_ok=True)
    name = os.path.basename(args.image)

    if args.list_stars or not args.star:
        best = None
        if not args.list_stars:
            prep = _prepare(gray, args.image)
            cats = [(_catalogue(_toUtc(local, zone), lat, lon, min_alt=15.0), zone) for zone in zones]
            found = [(b, c, zone) for c, zone in cats for b in [_identify(prep, c)] if b is not None]
            if not found:
                found = [(b, c, zone) for c, zone in cats
                         for b in [_leaning(prep, c, lambda cc, tilt: _identifyLeaning(prep, cc, tilt))] if b is not None]
            if found:
                best, cat, used = _pick(found)
        _clearImages(outdir)
        if best is not None and best[2] < 0:
            out.heading("Stars found automatically")
            if used != zones[0]:
                _reportZone(out, used, name)
            out.para("The stars were identified without your help. Check the labelled image in the Images tab: "
                     "if the names sit on the right stars, the settings below are ready to use. If they don't, "
                     "enter two stars yourself.")
            _labelImage(img.copy(), cat, best[0], best[2], best[1], _skyRegion(gray),
                        os.path.join(outdir, "overlay_stars.jpg"))
            _report(out, img, gray, cat, name, best, outdir, args.update, auto=True)
        else:
            if not args.list_stars:
                if out.html:
                    out.summary("The stars couldn't be found automatically. In Settings, open \"Only if the stars "
                                "aren't found automatically\", enter two of the stars listed in the Output tab, click "
                                "each one in the image with Pick, and press Run again.", "warning", open_group="stars")
                else:
                    out.summary("The stars couldn't be found automatically. Pick two of the stars listed below, "
                                "find them in the grid image, and run again with --star twice.", "warning")
                hint = _timeHint(utc, lat, lon, lambda c: _identify(prep, c, quick=True))
                if hint is not None:
                    _reportHint(out, hint, zones[0])
            _listStars(out, cat, name, None)
            _gridImage(img.copy(), os.path.join(outdir, "overlay_grid.jpg"))
        _link(out, outdir)
        if not args.html:
            print(f"Done in {time.time() - started:.0f} s.")
        return

    if getattr(args, "incomplete", None):
        raise Failure(args.incomplete)
    if len(args.star) != 2:
        raise Failure("Give exactly two stars.")
    picked = [_parseStar(s, cat) for s in args.star]
    if picked[0][0] == picked[1][0]:
        raise Failure("The two stars must be different.")
    if math.hypot(picked[0][1] - picked[1][1], picked[0][2] - picked[1][2]) < 0.05 * W:
        raise Failure("The two stars are too close together in the image; pick two further apart.")

    prep = {"W": W, "H": H, "stars": _starMap(gray), "sky": _skyRegion(gray)}
    cats = [(_catalogue(_toUtc(local, zone), lat, lon, min_alt=15.0), zone) for zone in zones]
    found = [(b, c, zone) for c, zone in cats for b in [_calibrate(prep, c, picked)] if b is not None]
    if not any(_strong(f[0]) for f in found):     # a weak fit may be the wrong time or a leaning camera
        found += [(b, c, zone) for c, zone in cats
                  for b in [_leaning(prep, c, lambda cc, tilt: _calibrate(prep, cc, picked, tilt))] if b is not None]
    strong = [f for f in found if _strong(f[0])]
    best = None
    if strong or found:
        best, cat, used = _pick(strong or found)
    if best is None:
        hint = _timeHint(utc, lat, lon, lambda c: _calibrate(prep, c, picked))
        if hint is not None:
            _reportHint(out, hint, zones[0])
        raise Failure("No consistent fit. Check that the image is clear and dark, that the two names match "
                      "the stars you picked, and that each position is on the star (a few pixels off is fine).")
    _clearImages(outdir)
    if used != zones[0]:
        _reportZone(out, used, name)
    _report(out, img, gray, cat, name, best, outdir, args.update)
    _link(out, outdir)
    if not args.html:
        print(f"Done in {time.time() - started:.0f} s.")


def _report(out, img, gray, cat, name, best, outdir, update=False, auto=False):
    """The fit, the overlay settings per Website, the check image and, with update,
    the settings written into the Websites."""
    H, W = gray.shape
    p, pairs, flip, rms_px, rms_deg = best
    out.heading("Fit to the stars")
    out.table(None, [
        ("Image", f"{name} ({W} x {H})"),
        ("Bright stars used", len(pairs)),
        ("Remaining error", f"{rms_deg:.2f} deg ({rms_px:.1f} px)"),
        ("Zenith at pixel", "%.0f, %.0f" % tuple(float(v) for v in _project(90.0, 0.0, p, flip))),
        ("Rotation", f"{p[4] % 360:.1f} deg"),
        ("Camera leans", f"{math.hypot(*_tiltOf(p)):.1f} deg toward {_compass(_tiltAz(p))}"),
    ])
    if flip > 0:
        raise Failure("This image shows East on the RIGHT (mirror-imaged). The constellation overlay always "
                      "draws East on the left, so no overlay setting can match it. Flip the image in Allsky's "
                      "settings, take a new image, and try again.")
    weak = rms_deg > 0.6 or len(pairs) < 15
    found = f"{'Found' if auto else 'Fitted'} {len(pairs)} bright stars ({rms_deg:.2f} deg error)."
    if weak:
        out.summary(f"{found} That is a weak fit: try a clearer, darker image.", "warning")
    elif auto:
        out.summary(f"{found} Check in the Images tab that the names sit on the right stars.", "success")
    else:
        out.summary(f"{found} Check in the Images tab that each green circle sits on a star.", "success")

    # One table per distinct Website set-up; local and remote usually share one.
    configs = []
    for kind, label, path, cfg in _websiteConfigs() or [(None, "Website", None, {"imageWidth": 900})]:
        now = tuple(cfg.get(k) for k in OVERLAY_KEYS + ("imageWidth",))
        same = next((c for c in configs if c[3] == now), None)
        if same:
            same[0] = same[0].replace(" Website", "") + " and " + label
            same[1].append((kind, label, path))
        else:
            configs.append([label, [(kind, label, path)], cfg, now])
    shown = None
    targets = []
    sky = _skyRegion(gray)
    for label, sites, cfg, _ in configs:
        design_w = float(cfg.get("imageWidth") or 900)
        fits, zmax = _overlayFit(p, flip, sky, design_w)
        proj = min(fits, key=lambda k: fits[k][4])
        st = _overlaySettings(fits[proj], proj, design_w, W)
        out.heading(f"Overlay settings for the {label} (imageWidth {design_w:g})")
        out.table(("Setting", "Suggested", "Now"), [(k, st[k], cfg.get(k, "")) for k in OVERLAY_KEYS])
        out.table(("Projection", "Error RMS", "95% of sky", "Worst"),
                  [(k + ("  <- best" if k == proj else ""), f"{v[4]:.2f} deg", f"{v[5]:.2f} deg", f"{v[6]:.2f} deg")
                   for k, v in sorted(fits.items(), key=lambda kv: kv[1][4])])
        try:
            unequal = float(cfg["overlayWidth"]) != float(cfg["overlayHeight"])
        except (KeyError, TypeError, ValueError):
            unequal = False
        if unequal:
            out.para("Note: overlayWidth and overlayHeight differ now. The overlay isn't made for that, "
                     "so keep them equal, as suggested.")
        if shown is None:
            shown = (st, design_w)
        targets += [(kind, site, path, st) for kind, site, path in sites if kind]
    out.para(f"With these settings the overlay should sit within about {fits[proj][5]:.1f} deg of the stars over "
             "most of the sky.")
    tilt = math.hypot(*_tiltOf(p))
    if tilt >= 3.0:
        words = {"N": "north", "NE": "north-east", "E": "east", "SE": "south-east", "S": "south",
                 "SW": "south-west", "W": "west", "NW": "north-west"}
        out.summary(f"The camera leans about {tilt:.0f} degrees toward the {words[_compass(_tiltAz(p))]}. The Website's "
                    "overlay assumes a level camera, so it can only match to about "
                    f"{fits[proj][5]:.1f} degrees over most of the sky; levelling the camera makes it fit better.",
                    "warning")
    how = "turn on Update the Website and press Run again" if out.html else "run again with --update"
    if not update:
        out.summary(f"Nothing was changed. To use these settings, {how}, or enter them in the Website's "
                    "configuration yourself.", "info")
    elif weak:
        out.summary("The Website was NOT changed, because the fit is weak.", "warning")
    elif not targets:
        out.summary("The Website was NOT changed: there is no Website configuration.", "warning")
    else:
        rows = _updateWebsites(out, targets)
        failed = [label for label, result in rows if "NOT" in result or "FAILED" in result]
        done = [f"{label}: {result}" for label, result in rows if result.startswith("updated") and "FAILED" not in result]
        if failed:
            out.summary(f"The Website update FAILED for: {', '.join(failed)}. See the Output tab.", "danger")
        elif done:
            out.summary(f"The Website was updated ({'; '.join(done)}). Reload it to see the new overlay.", "success")
        else:
            out.summary("The Website was NOT changed: no Website is enabled.", "warning")
    _checkImage(img.copy(), cat, p, flip, shown[0], shown[1], pairs, sky, os.path.join(outdir, "overlay_check.jpg"))


def _tiltAz(p):
    tx, ty = _tiltOf(p)
    return math.degrees(math.atan2(tx, ty)) % 360.0


def _compass(az):
    return ("N", "NE", "E", "SE", "S", "SW", "W", "NW")[int((az + 22.5) % 360 // 45)]


def _clearImages(outdir):
    """Remove the previous run's images, so the Images tab shows only this run's.
    Called only once this run is sure to write new ones."""
    for old in ("overlay_grid.jpg", "overlay_stars.jpg", "overlay_check.jpg"):
        try:
            os.remove(os.path.join(outdir, old))
        except OSError:
            pass


def _link(out, outdir):
    """The link the WebUI turns into the Images tab.  It shows a folder directly below
    ALLSKY_IMAGES, or with root=current one below ALLSKY_CURRENT_DIR."""
    day = os.path.basename(outdir.rstrip("/"))
    parent = os.path.realpath(os.path.dirname(outdir.rstrip("/")))
    current = os.environ.get("ALLSKY_CURRENT_DIR") or os.path.join(
        os.environ.get("ALLSKY_TMP") or os.path.join(ALLSKY_HOME, "tmp"), "current_images")
    root = "&root=current" if parent == os.path.realpath(current) else ""
    if out.html:
        print(f"<p>Click <a href='/helpers/show_images.php?_ts={int(time.time())}{root}"
              f"&day={day}&pre=overlay_&type=Constellation Overlay' external='true'>here</a> "
              "to see the results.</p>")
    else:
        print(f"Check images are in '{outdir}'.")


if __name__ == "__main__":
    main()
