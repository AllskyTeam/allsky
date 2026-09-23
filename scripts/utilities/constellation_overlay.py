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
                       (default: ${ALLSKY_IMAGES}/test_constellation_overlay)
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

    def error(self, text):
        if self.html:
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

def _project(alt, az, p, flip):
    cx, cy, a1, a3, rot = p
    t = (90.0 - np.asarray(alt)) / 90.0
    r = a1 * t + a3 * t ** 3
    ang = np.radians(rot + flip * np.asarray(az))
    return cx + r * np.sin(ang), cy - r * np.cos(ang)


def _unproject(x, y, p, flip):
    """Pixel -> (alt, az) for the fitted lens; Newton on r = a1*t + a3*t^3."""
    cx, cy, a1, a3, rot = p
    dx, dy = x - cx, cy - y
    r = np.hypot(dx, dy)
    az = ((np.degrees(np.arctan2(dx, dy)) - rot) * flip) % 360.0
    t = np.clip(r / a1, 0.0, 1.5)
    for _ in range(30):
        f = a1 * t + a3 * t ** 3 - r
        fp = np.maximum(a1 + 3 * a3 * t * t, 1e-6)
        t = np.clip(t - f / fp, 0.0, 1.5)
    return 90.0 - 90.0 * t, az


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


def _fitPairs(pairs, p0, flip, free_a3):
    def resid(q):
        pp = (q[0], q[1], q[2], q[3] if free_a3 else p0[3], q[4])
        x, y = _project(pairs[:, 0], pairs[:, 1], pp, flip)
        return np.concatenate([x - pairs[:, 2], y - pairs[:, 3]])
    q = list(least_squares(resid, np.asarray(p0, float), loss="soft_l1", f_scale=6.0).x)
    if not free_a3:
        q[3] = p0[3]
    return q


def _refine(cat, stars, sky, p, flip, W):
    """Shrink the search window step by step; the cubic term is freed once the linear
    part has settled.  Returns (params, pairs) or (None, pairs)."""
    s = W / 3840.0
    p = list(p)
    pairs = np.empty((0, 4))
    for it, rad in enumerate((100, 80, 62, 48, 38, 30, 24, 20)):
        pairs = _brightPairs(cat, stars, sky, p, flip, rad * s)
        if len(pairs) < 8:
            return None, pairs
        p = _fitPairs(pairs, p, flip, free_a3=(it >= 2))
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


def _calibrate(prep, cat, picked):
    """Fit the lens from two identified stars; try both handedness."""
    stars, sky, W = prep["stars"], prep["sky"], prep["W"]
    if any(name not in set(cat[3]) for name, _, _ in picked):
        return None                              # not up at this time
    best = None
    for flip in (-1.0, 1.0):
        p, pairs = _refine(cat, stars, sky, _seed(picked, cat, flip), flip, W)
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


# --- when the image's time doesn't fit ----------------------------------------------

def _strong(best):
    return best is not None and len(best[1]) >= 15 and best[4] <= 0.5


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
    out.para(f"Note: the time in the image's name ({name}) didn't fit the stars in {_zoneName(None)}, "
             f"so it was read as {zone} time, the time zone nearest to the camera's location. "
             "If that's wrong, run again with the right one (--timezone).")


def _reportHint(out, hours, zone):
    out.para(f"The stars would roughly fit if this image had been taken about {abs(hours)} hours "
             f"{'later' if hours > 0 else 'earlier'} than its name says, read in {_zoneName(zone)}. So the time zone "
             "is probably wrong: check the time zone set on the camera's Pi, or, for an image from another "
             "camera, run again with that camera's time zone (--timezone, e.g. America/Chicago).")


# --- overlay -------------------------------------------------------------------------

def _overlayFit(p, flip, sky, design_w):
    """Best radius per virtualsky projection over the visible sky.
    Returns {name: (R, rms_deg, p95_deg, max_deg)} and the widest zenith angle used."""
    H, W = sky.shape
    s = design_w / float(W)
    step = max(8, W // 160)
    ys, xs = np.mgrid[0:H:step, 0:W:step]
    xs, ys = xs.ravel().astype(float), ys.ravel().astype(float)
    keep = sky[ys.astype(int), xs.astype(int)]
    xs, ys = xs[keep], ys[keep]
    alt, _ = _unproject(xs, ys, p, flip)
    keep = alt > 2.0
    xs, ys, alt = xs[keep], ys[keep], alt[keep]
    if len(xs) < 50:
        raise Failure("Too little sky in the image to fit the overlay.")
    z = np.radians(90.0 - alt)
    r_img = np.hypot(xs - p[0], ys - p[1])
    t = z / (math.pi / 2)
    px_per_deg = (p[2] + 3 * p[3] * t ** 2) / 90.0
    fits = {}
    for name, f in PROJECTIONS.items():
        k = f(z)
        R = float(np.dot(k, r_img * s) / np.dot(k, k))
        err = np.abs((R * k / s - r_img) / px_per_deg)
        fits[name] = (R, float(np.sqrt(np.mean(err ** 2))), float(np.percentile(err, 95)), float(err.max()))
    return fits, float(np.degrees(z).max())


def _overlaySettings(p, R, projection, design_w, W):
    s = design_w / float(W)
    return {
        "projection": projection,
        "overlayWidth": int(round(2 * R)),
        "overlayHeight": int(round(2 * R)),
        "overlayOffsetLeft": int(round(p[0] * s - R)),
        "overlayOffsetTop": int(round(p[1] * s - R)),
        "az": round((p[4] + 180.0) % 360.0, 1),
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


def _checkImage(img, cat, p, flip, st, design_w, pairs, path):
    H, W = img.shape[:2]
    k = W / 3840.0
    lw, fs = max(1, int(round(3 * k))), 1.3 * k
    alt, az, _, names = cat
    x0, y0 = _project(alt, az, p, flip)
    xv, yv = _overlayXY(alt, az, st, design_w, W) if st else (None, None)
    for i in range(len(alt)):
        if not (0 <= x0[i] < W and 0 <= y0[i] < H):
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
    cv2.drawMarker(img, (int(p[0]), int(p[1])), (255, 0, 255), cv2.MARKER_CROSS, int(80 * k), lw)
    legend = "green circle = where each bright star is (fit)   magenta = star found in the image"
    if st is not None:
        legend += "   yellow cross = where the overlay draws it"
    (tw, th), _ = cv2.getTextSize(legend, cv2.FONT_HERSHEY_SIMPLEX, fs, lw)
    cv2.rectangle(img, (0, H - th - int(60 * k)), (tw + int(80 * k), H), (0, 0, 0), -1)
    cv2.putText(img, legend, (int(40 * k), H - int(30 * k)), cv2.FONT_HERSHEY_SIMPLEX, fs, (0, 255, 255), lw)
    _save(img, path)


def _labelImage(img, cat, p, flip, path):
    """The image with each named bright star circled and labelled, for the user to check."""
    H, W = img.shape[:2]
    k = W / 3840.0
    lw = max(2, int(round(3 * k)))
    alt, az, _, names = cat
    x, y = _project(alt, az, p, flip)
    for i in range(len(alt)):
        if not names[i] or not (0 <= x[i] < W and 0 <= y[i] < H):
            continue
        c = (int(x[i]), int(y[i]))
        cv2.circle(img, c, int(34 * k), (0, 255, 255), lw)
        label = names[i].title()
        (tw, _), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 1.5 * k, lw)
        org = (c[0] + int(40 * k), c[1] - int(24 * k))
        if org[0] + tw > W:                     # near the right edge: label on the left
            org = (c[0] - int(40 * k) - tw, org[1])
        cv2.putText(img, label, org, cv2.FONT_HERSHEY_SIMPLEX, 1.5 * k, (0, 0, 0), lw + 3)
        cv2.putText(img, label, org, cv2.FONT_HERSHEY_SIMPLEX, 1.5 * k, (0, 255, 255), lw)
    _save(img, path)


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
    images = os.environ.get("ALLSKY_IMAGES") or os.path.join(ALLSKY_HOME, "images")
    outdir = args.directory or os.path.join(images, "test_constellation_overlay")
    os.makedirs(outdir, exist_ok=True)
    name = os.path.basename(args.image)

    if args.list_stars or not args.star:
        best = None
        if not args.list_stars:
            prep = _prepare(gray, args.image)
            for zone in zones:
                c = _catalogue(_toUtc(local, zone), lat, lon, min_alt=15.0)
                best = _identify(prep, c)
                if best is not None:
                    cat, used = c, zone
                    break
        _clearImages(outdir)
        if best is not None and best[2] < 0:
            out.heading("Stars found automatically")
            if used != zones[0]:
                _reportZone(out, used, name)
            out.para("The stars were identified without your help. Check the labelled image in the Images tab: "
                     "if the names sit on the right stars, the settings below are ready to use. If they don't, "
                     "enter two stars yourself.")
            _labelImage(img.copy(), cat, best[0], best[2], os.path.join(outdir, "overlay_stars.jpg"))
            _report(out, img, gray, cat, name, best, outdir, args.update)
        else:
            if not args.list_stars:
                out.para("The stars could not be identified automatically in this image, so please pick two "
                         "yourself: enter their names and click each one.")
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
    best = None
    for zone in zones:                            # a weak fit in the first zone may be the wrong time
        c = _catalogue(_toUtc(local, zone), lat, lon, min_alt=15.0)
        b = _calibrate(prep, c, picked)
        if b is not None and (best is None or _strong(b) and not _strong(best)):
            best, cat, used = b, c, zone
        if _strong(best):
            break
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


def _report(out, img, gray, cat, name, best, outdir, update=False):
    """The fit, the overlay settings per Website, the check image and, with update,
    the settings written into the Websites."""
    H, W = gray.shape
    p, pairs, flip, rms_px, rms_deg = best
    out.heading("Fit to the stars")
    out.table(None, [
        ("Image", f"{name} ({W} x {H})"),
        ("Bright stars used", len(pairs)),
        ("Remaining error", f"{rms_deg:.2f} deg ({rms_px:.1f} px)"),
        ("Zenith at pixel", f"{p[0]:.0f}, {p[1]:.0f}"),
        ("Rotation", f"{p[4] % 360:.1f} deg"),
    ])
    if flip > 0:
        raise Failure("This image shows East on the RIGHT (mirror-imaged). The constellation overlay always "
                      "draws East on the left, so no overlay setting can match it. Flip the image in Allsky's "
                      "settings, take a new image, and try again.")
    weak = rms_deg > 0.6 or len(pairs) < 15
    if weak:
        out.para("Warning: the fit is weak (few stars or a large error). Try a clearer, darker image.")

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
        proj = min(fits, key=lambda k: fits[k][1])
        st = _overlaySettings(p, fits[proj][0], proj, design_w, W)
        out.heading(f"Overlay settings for the {label} (imageWidth {design_w:g})")
        out.table(("Setting", "Suggested", "Now"), [(k, st[k], cfg.get(k, "")) for k in OVERLAY_KEYS])
        out.table(("Projection", "Error RMS", "95% of sky", "Worst"),
                  [(k + ("  <- best" if k == proj else ""), f"{v[1]:.2f} deg", f"{v[2]:.2f} deg", f"{v[3]:.2f} deg")
                   for k, v in sorted(fits.items(), key=lambda kv: kv[1][1])])
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
    out.para(f"With these settings the overlay should sit within about {fits[proj][2]:.1f} deg of the stars over "
             "most of the sky.")
    if not update:
        out.para("Nothing has been changed. Enter the settings in the Website's configuration, "
                 "or run again with the Website update turned on.")
    elif weak:
        out.para("The Website configuration was NOT changed because the fit is weak.")
    elif not targets:
        out.para("There is no Website configuration to update.")
    else:
        _updateWebsites(out, targets)
    _checkImage(img.copy(), cat, p, flip, shown[0], shown[1], pairs, os.path.join(outdir, "overlay_check.jpg"))


def _clearImages(outdir):
    """Remove the previous run's images, so the Images tab shows only this run's.
    Called only once this run is sure to write new ones."""
    for old in ("overlay_grid.jpg", "overlay_stars.jpg", "overlay_check.jpg"):
        try:
            os.remove(os.path.join(outdir, old))
        except OSError:
            pass


def _link(out, outdir):
    day = os.path.basename(outdir.rstrip("/"))
    if out.html:
        print(f"<p>Click <a href='/helpers/show_images.php?_ts={int(time.time())}"
              f"&day={day}&pre=overlay_&type=Constellation Overlay' external='true'>here</a> "
              "to see the results.</p>")
    else:
        print(f"Check images are in '{outdir}'.")


if __name__ == "__main__":
    main()
