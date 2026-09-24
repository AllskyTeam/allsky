#!/usr/bin/env python3
"""
Dark frames and hot pixels.  All three commands keep themselves up to date,
so the results get better the longer Allsky runs.

  subtract IMAGE [--dark DARK]
	Subtract the dark frame, if given, and repair hot pixels.
	- The dark frame is scaled to fit the image: dark current depends on the
	  exposure time and on the temperature, and grows as the sensor ages, so a
	  dark frame taken at a different exposure or temperature, or long ago,
	  would take off too much or too little.  The scale is found by comparing
	  the dark frame's hot pixels with the same pixels in the image.
	- A hot pixel is often as bright in the image as in the dark frame, or
	  saturated in both, so subtracting would leave a black dot.  Every hot
	  pixel is therefore replaced by the average of its good neighbours.
	  Hot pixels are those in the dark frame and those learned from the images
	  (see "hot-pixels"), so hot pixels that are newer than the dark frames
	  are repaired too.
	- The image is also noted for learning hot pixels.

  add-dark IMAGE DARK
	Add a new dark frame to the master dark frame DARK for that temperature.
	A single dark frame adds its own noise to every image; the average of many
	has much less.  The first MAX_DARKS frames are averaged equally, then each
	new one replaces an equal share of the old ones, so the master dark keeps
	up with the sensor.  The average is also kept with 16 bits in masters/.

  hot-pixels
	Run at the end of the night: a pixel that was a single spike, much brighter
	or darker than the pixels around it, in most (HOT_FRACTION) of the night's
	images is a hot or dead pixel, since stars move but hot pixels don't.
	Saves the new hot pixel map.

Exit code 0 on success, non-zero on error (files are then unchanged).
"""

import argparse
import json
import os
import sys
import time

import cv2
import numpy as np

NEIGHBOURS = 5			# size of the square around a hot pixel that is averaged
DARK_THRESHOLD = 0.08	# a pixel this much (of full scale) brighter than its neighbours
						# in the dark frame is hot
LIGHT_THRESHOLD = 0.03	# minimum difference from its neighbours for a pixel in an image
						# to be a hot pixel candidate; also at least LIGHT_SIGMAS noise
LIGHT_SIGMAS = 6
MAX_CANDIDATES = 0.01	# ignore an image with more candidates than this fraction of its pixels
HOT_FRACTION = 0.75		# a hot pixel must be a candidate in this fraction of the night's images
MIN_IMAGES = 30			# need this many images in a night to make a new hot pixel map
SCALE_THRESHOLD = 0.04	# pixels used to scale the dark frame must be this much brighter
SCALE_SIGMAS = 8		# than their neighbours in it, and at least SCALE_SIGMAS noise
MAX_DARKS = 50			# see "add-dark"

ALLSKY_DARKS = os.environ.get("ALLSKY_DARKS", os.path.expanduser("~/allsky/darks"))
ALLSKY_TMP = os.environ.get("ALLSKY_TMP", os.path.expanduser("~/allsky/tmp"))


def paths(a):
	darks = a.darks_dir or ALLSKY_DARKS
	tmp = a.tmp_dir or ALLSKY_TMP
	return {
		"map": os.path.join(darks, "hot_pixels.npz"),
		"masters_dir": os.path.join(darks, "masters"),
		"masters": os.path.join(darks, "masters", "counts.json"),
		"candidates": os.path.join(tmp, "hot_pixel_candidates.npz"),
	}


# ---------- files

def read(path):
	img = cv2.imread(path, cv2.IMREAD_UNCHANGED)
	if img is None:
		raise ValueError(f"unable to read '{path}'")
	if img.ndim == 3 and img.shape[2] == 4:
		img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
	return img


def write_image(path, img, quality):
	ext = os.path.splitext(path)[1].lower()
	if ext in (".jpg", ".jpeg"):
		params = [cv2.IMWRITE_JPEG_QUALITY, quality]
	elif ext == ".png":
		params = [cv2.IMWRITE_PNG_COMPRESSION, min(quality, 9)]
	else:
		params = []
	# Write to a temporary file first so a failure never leaves a half-written image.
	tmp = f"{os.path.dirname(path) or '.'}/.darkFrames-{os.getpid()}{ext}"
	if not cv2.imwrite(tmp, img, params):
		raise ValueError(f"unable to write '{path}'")
	os.replace(tmp, path)


def save_npz(path, **arrays):
	tmp = f"{path}.{os.getpid()}.npz"
	np.savez_compressed(tmp, **arrays)
	os.replace(tmp, path)


def load_json(path):
	try:
		with open(path) as f:
			return json.load(f)
	except (OSError, ValueError):
		return {}


def save_json(path, data):
	tmp = f"{path}.{os.getpid()}"
	with open(tmp, "w") as f:
		json.dump(data, f, indent=4)
	os.replace(tmp, path)


# ---------- helpers

def full_scale(img):
	return 65535 if img.dtype == np.uint16 else 255


def brightest(img):
	if img.ndim == 2:
		return img
	c = cv2.split(img)
	out = c[0]
	for x in c[1:]:
		out = cv2.max(out, x)
	return out


def match_dark(dark, img):
	"""Return the dark frame with the image's channels and bit depth."""
	if dark.shape[:2] != img.shape[:2]:
		raise ValueError(f"dark frame is {dark.shape[1]}x{dark.shape[0]} but the image is {img.shape[1]}x{img.shape[0]}")
	if img.ndim == 3 and dark.ndim == 2:
		dark = cv2.cvtColor(dark, cv2.COLOR_GRAY2BGR)
	elif img.ndim == 2 and dark.ndim == 3:
		dark = cv2.cvtColor(dark, cv2.COLOR_BGR2GRAY)
	if dark.dtype != img.dtype:
		dark = np.clip(dark.astype(np.float32) * (full_scale(img) / full_scale(dark)) + 0.5,
			0, full_scale(img)).astype(img.dtype)
	return dark


def load_map(path, shape):
	"""The learned hot pixels as (rows, cols), or None."""
	try:
		with np.load(path) as m:
			if tuple(m["shape"]) != tuple(shape):
				return None		# a different binning or camera
			return m["rows"], m["cols"]
	except (OSError, KeyError, ValueError):
		return None


# ---------- subtract

def split_dark(dark):
	"""Split the dark frame into its smooth part (the camera's offset, amp glow)
	and the pixels brighter and darker than that (hot pixels, cold pixels)."""
	smooth = cv2.medianBlur(dark, 5)	# 5 is the largest size that also works for 16-bit
	return smooth, cv2.subtract(dark, smooth), cv2.subtract(smooth, dark)


def local_median(img, ys, xs):
	"""Median of the 5x5 pixels around each (ys, xs), for all channels."""
	h, w = img.shape[:2]
	dy, dx = np.mgrid[-2:3, -2:3]
	ny = np.clip(ys[:, None] + dy.ravel(), 0, h - 1)
	nx = np.clip(xs[:, None] + dx.ravel(), 0, w - 1)
	return np.median(img[ny, nx].astype(np.float32), axis=1)


def spike_scale(img, spikes, fs):
	"""How much of the dark frame's spikes are in the image (1 = all of them).
	The spikes are smaller when the image had a shorter exposure or a lower
	temperature than the dark frame, and in a JPG image, which blurs single
	pixels, but not in the dark frame, which is a PNG.
	Each channel is compared on its own, since a hot pixel is usually hot in one."""
	s = spikes if spikes.ndim == 3 else spikes[..., None]
	im = img if img.ndim == 3 else img[..., None]
	# Only pixels clearly brighter in the dark frame, well above its noise (weak
	# ones give too small a scale), and not saturated in the image.
	noise = 1.4826 * float(np.median(s[::4, ::4]))
	use = (s > max(SCALE_THRESHOLD * fs, SCALE_SIGMAS * noise)) & (im < 0.95 * fs)
	ys, xs, cs = np.nonzero(use)
	if len(ys) < 50:
		return 1.0
	if len(ys) > 20000:		# plenty; keep it quick
		pick = np.random.default_rng(0).choice(len(ys), 20000, replace=False)
		ys, xs, cs = ys[pick], xs[pick], cs[pick]
	in_image = im[ys, xs, cs] - local_median(im, ys, xs)[np.arange(len(ys)), cs]
	k = float(np.median(in_image / s[ys, xs, cs].astype(np.float32)))
	return min(max(k, 0.0), 2.0)


def repair(img, hot):
	"""Replace each pixel in the mask "hot" with the average of the good pixels
	in the square around it.  Only the hot pixels are looked at, so this is fast
	even for big images."""
	h, w = hot.shape
	ys, xs = np.nonzero(hot)
	if len(ys) == 0:
		return img
	r = NEIGHBOURS // 2
	dy, dx = np.mgrid[-r:r + 1, -r:r + 1]
	ny = np.clip(ys[:, None] + dy.ravel(), 0, h - 1)		# (hot pixels, neighbours)
	nx = np.clip(xs[:, None] + dx.ravel(), 0, w - 1)
	good = ~hot[ny, nx]
	weight = good.sum(axis=1)
	values = img[ny, nx].astype(np.float32)
	if img.ndim == 3:
		average = (values * good[..., None]).sum(axis=1) / np.maximum(weight, 1)[:, None]
	else:
		average = (values * good).sum(axis=1) / np.maximum(weight, 1)
	fixable = weight > 0
	img[ys[fixable], xs[fixable]] = np.clip(average[fixable] + 0.5, 0, full_scale(img)).astype(img.dtype)

	# A cluster of hot pixels too big for the square: fill it from its edges.
	if not fixable.all():
		rest = np.zeros(hot.shape, np.uint8)
		rest[ys[~fixable], xs[~fixable]] = 1
		img = cv2.inpaint(img, rest, 3, cv2.INPAINT_TELEA)
	return img


def note_candidates(img, path):
	"""Remember which pixels stand out in this image, for "hot-pixels"."""
	gray = brightest(img)
	med = cv2.medianBlur(gray, 5)
	brighter = cv2.subtract(gray, med)
	darker = cv2.subtract(med, gray)
	noise = 1.4826 * float(np.median((brighter[::4, ::4] | darker[::4, ::4])))
	threshold = max(LIGHT_THRESHOLD * full_scale(img), LIGHT_SIGMAS * noise)
	# A hot (or dead) pixel is a single spike, so it is also the brightest (darkest)
	# pixel around it; this leaves out most of the scenery.
	square = np.ones((3, 3), np.uint8)
	hot = (brighter > threshold) & (brighter >= cv2.dilate(brighter, square))
	dead = (darker > threshold) & (darker >= cv2.dilate(darker, square))
	cand = np.flatnonzero(hot | dead).astype(np.uint32)
	if len(cand) > MAX_CANDIDATES * gray.size:
		return	# e.g. very noisy; don't count this image

	shape = np.array(gray.shape)
	idx = np.zeros(0, np.uint32)
	cnt = np.zeros(0, np.uint16)
	images = 0
	try:
		with np.load(path) as c:
			if tuple(c["shape"]) == tuple(shape):
				idx, cnt, images = c["idx"], c["cnt"], int(c["images"])
	except (OSError, KeyError, ValueError):
		pass

	# Add 1 to the count of every candidate.
	all_idx = np.concatenate([idx, cand])
	all_cnt = np.concatenate([cnt, np.ones(len(cand), np.uint16)])
	idx, inverse = np.unique(all_idx, return_inverse=True)
	cnt = np.bincount(inverse, weights=all_cnt).astype(np.uint16)
	images += 1

	# Stars move, so pixels that are rarely candidates can be forgotten;
	# this keeps the file small.  A hot pixel is a candidate in most images.
	if images >= 10:
		keep = cnt >= 0.25 * images
		idx, cnt = idx[keep], cnt[keep]

	save_npz(path, idx=idx, cnt=cnt, images=images, shape=shape)


def cmd_subtract(a):
	p = paths(a)
	img = read(a.image)
	fs = full_scale(img)
	hot = np.zeros(img.shape[:2], bool)
	k = None

	if a.dark:
		dark = match_dark(read(a.dark), img)
		smooth, brighter, darker = split_dark(dark)
		hot |= brightest(brighter) > DARK_THRESHOLD * fs
		# The smooth part and cold pixels are subtracted as they are,
		# hot pixels scaled to fit the image.
		k = spike_scale(img, brighter, fs) if a.scale else 1.0
		result = cv2.subtract(img, smooth)
		result = cv2.addWeighted(result, 1.0, brighter, -k, 0.0)
		result = cv2.add(result, darker)
	else:
		result = img.copy()

	learned = load_map(p["map"], img.shape[:2])
	if learned is not None:
		m = np.zeros(img.shape[:2], np.uint8)
		m[learned] = 1
		if img.ndim == 3:
			# Debayering spreads a hot pixel into the pixels around it.
			m = cv2.dilate(m, np.ones((3, 3), np.uint8))
		hot |= m.astype(bool)

	if a.learn:
		try:
			note_candidates(img, p["candidates"])
		except Exception as e:		# never lose the image because of this
			print(f"darkFrames.py: WARNING: unable to note hot pixel candidates: {e}", file=sys.stderr)

	if a.repair:
		result = repair(result, hot)

	write_image(a.output or a.image, result, a.quality)
	if a.verbose:
		msg = f"darkFrames.py: repaired {int(hot.sum())} hot pixels"
		if learned is not None:
			msg += f" ({len(learned[0])} learned from images)"
		if k is not None:
			msg += f", dark frame's hot pixels scaled by {k:.2f}"
		print(msg)


# ---------- add-dark

def cmd_add_dark(a):
	p = paths(a)
	new = read(a.image)
	name = os.path.basename(a.dark)
	# The average is kept with 16 bits in masters/, otherwise rounding would stop a
	# long average from changing; the dark frame used for subtracting has the
	# images' bit depth, which is quicker to read.
	os.makedirs(p["masters_dir"], exist_ok=True)
	acc_path = os.path.join(p["masters_dir"], os.path.splitext(name)[0] + ".png")
	counts = load_json(p["masters"])
	n = int(counts.get(name, 0))

	old = None
	for path in (acc_path, a.dark):		# a dark frame from before master darks counts once
		if os.path.exists(path):
			try:
				old = read(path)
			except ValueError:
				continue
			if old.shape != new.shape:
				old = None		# different binning or camera: start again
				continue
			n = 1 if path == a.dark else max(n, 1)
			break
	if old is None:
		n = 0

	value = new.astype(np.float32) * (65535 / full_scale(new))
	if old is not None:
		w = 1.0 / min(n + 1, MAX_DARKS)
		value = old.astype(np.float32) * (65535 / full_scale(old)) * (1 - w) + value * w
	write_image(acc_path, np.clip(value + 0.5, 0, 65535).astype(np.uint16), 1)
	if new.dtype == np.uint16:
		dark = np.clip(value + 0.5, 0, 65535).astype(np.uint16)
	else:
		dark = np.clip(value / 257 + 0.5, 0, 255).astype(np.uint8)
	write_image(a.dark, dark, 1 if a.dark.lower().endswith(".png") else 95)

	counts[name] = n + 1
	save_json(p["masters"], counts)
	if a.verbose:
		print(f"darkFrames.py: '{name}' is now the average of {min(n + 1, MAX_DARKS)} dark frames")


# ---------- hot-pixels

def cmd_hot_pixels(a):
	p = paths(a)
	try:
		with np.load(p["candidates"]) as c:
			idx, cnt, images, shape = c["idx"], c["cnt"], int(c["images"]), tuple(c["shape"])
	except (OSError, KeyError, ValueError):
		if a.verbose:
			print("darkFrames.py: no hot pixel candidates; hot pixel map unchanged")
		return

	if images < MIN_IMAGES:
		msg = f"only {images} images, need {MIN_IMAGES}; hot pixel map unchanged"
	else:
		hot = idx[cnt >= HOT_FRACTION * images]
		rows, cols = np.unravel_index(hot, shape)
		save_npz(p["map"], rows=rows.astype(np.uint16), cols=cols.astype(np.uint16),
			shape=np.array(shape), images=images, date=time.strftime("%Y%m%d"))
		msg = f"{len(hot)} hot pixels in {images} images"
	os.remove(p["candidates"])
	if a.verbose:
		print(f"darkFrames.py: {msg}")


def main():
	parser = argparse.ArgumentParser(description="Dark frames and hot pixels.")
	parser.add_argument("--darks-dir", help=f"default {ALLSKY_DARKS}")
	parser.add_argument("--tmp-dir", help=f"default {ALLSKY_TMP}")
	parser.add_argument("--verbose", action="store_true")
	sub = parser.add_subparsers(dest="command", required=True)

	s = sub.add_parser("subtract", help="subtract a dark frame and repair hot pixels")
	s.add_argument("image")
	s.add_argument("--dark", help="dark frame; without it only hot pixels are repaired")
	s.add_argument("--output", help="write here instead of overwriting the image")
	s.add_argument("--quality", type=int, default=95, help="JPG quality or PNG compression (default 95)")
	s.add_argument("--no-scale", dest="scale", action="store_false", help="don't scale the dark frame")
	s.add_argument("--no-repair", dest="repair", action="store_false", help="don't repair hot pixels")
	s.add_argument("--no-learn", dest="learn", action="store_false", help="don't use the image to learn hot pixels")

	s = sub.add_parser("add-dark", help="add a dark frame to a master dark frame")
	s.add_argument("image")
	s.add_argument("dark")

	sub.add_parser("hot-pixels", help="make the hot pixel map from the night's images")

	a = parser.parse_args()
	try:
		{"subtract": cmd_subtract, "add-dark": cmd_add_dark, "hot-pixels": cmd_hot_pixels}[a.command](a)
	except Exception as e:
		print(f"darkFrames.py: ERROR: {e}", file=sys.stderr)
		return 1
	return 0


if __name__ == "__main__":
	sys.exit(main())
