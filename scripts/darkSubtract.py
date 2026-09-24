#!/usr/bin/env python3
"""
Subtract a dark frame from an image and repair the camera's hot pixels.

Subtracting a dark frame removes hot pixels, but it leaves black dots where
they were: a hot pixel is often as bright in the image as in the dark frame
(or saturated in both), so nothing is left of the sky at that pixel.
Each such pixel is therefore replaced by the average of its good neighbours.

A pixel is "hot" when it is brighter in the dark frame than the median of the
5x5 pixels around it by more than --threshold (a fraction of full scale).
Comparing with the neighbours rather than the whole frame means amp glow and
other smooth brightening in the dark frame is still just subtracted.

Usage: darkSubtract.py IMAGE DARK [--output FILE] [--threshold 0.08] [--quality 95]
The image is overwritten unless --output is given.
Exit code 0 on success, non-zero on any error (the image is then unchanged).
"""

import argparse
import os
import sys

import cv2
import numpy as np

NEIGHBOURS = 5		# size of the square that is searched for good neighbours


def read(path):
	img = cv2.imread(path, cv2.IMREAD_UNCHANGED)
	if img is None:
		raise ValueError(f"unable to read '{path}'")
	if img.ndim == 3 and img.shape[2] == 4:
		img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
	return img


def full_scale(img):
	return 65535 if img.dtype == np.uint16 else 255


def match_dark(dark, img):
	"""Return the dark frame with the image's size, channels and bit depth."""
	if dark.shape[:2] != img.shape[:2]:
		raise ValueError(f"dark frame is {dark.shape[1]}x{dark.shape[0]} but the image is {img.shape[1]}x{img.shape[0]}")
	if dark.dtype != img.dtype:
		dark = (dark.astype(np.float32) * (full_scale(img) / full_scale(dark))).round().astype(img.dtype)
	if img.ndim == 3 and dark.ndim == 2:
		dark = cv2.cvtColor(dark, cv2.COLOR_GRAY2BGR)
	elif img.ndim == 2 and dark.ndim == 3:
		dark = cv2.cvtColor(dark, cv2.COLOR_BGR2GRAY)
	return dark


def hot_pixels(dark, threshold):
	"""Mask of the pixels much brighter in the dark frame than their neighbours."""
	d = dark if dark.ndim == 2 else dark.max(axis=2)
	local = cv2.medianBlur(d, 5)		# 5 is the largest size that also works for 16-bit
	excess = cv2.subtract(d, local)
	return excess > threshold * full_scale(dark)


def subtract(img, dark, threshold):
	"""Return (image - dark with hot pixels repaired, number of repaired pixels)."""
	result = cv2.subtract(img, dark)
	hot = hot_pixels(dark, threshold)
	count = int(hot.sum())
	if count == 0:
		return result, 0

	# Average of the good pixels around each hot pixel.
	# Only the hot pixels are looked at, so this is fast even for big images.
	h, w = hot.shape
	ys, xs = np.nonzero(hot)
	r = NEIGHBOURS // 2
	dy, dx = np.mgrid[-r:r + 1, -r:r + 1]
	ny = np.clip(ys[:, None] + dy.ravel(), 0, h - 1)		# (hot pixels, neighbours)
	nx = np.clip(xs[:, None] + dx.ravel(), 0, w - 1)
	good = ~hot[ny, nx]
	weight = good.sum(axis=1)
	values = result[ny, nx].astype(np.float32)
	if result.ndim == 3:
		total = (values * good[..., None]).sum(axis=1)
		average = total / np.maximum(weight, 1)[:, None]
	else:
		total = (values * good).sum(axis=1)
		average = total / np.maximum(weight, 1)

	fixable = weight > 0
	result[ys[fixable], xs[fixable]] = np.clip(average[fixable] + 0.5, 0, full_scale(result)).astype(result.dtype)

	# A cluster of hot pixels too big for the square: fill it from its edges.
	if not fixable.all():
		rest = np.zeros(hot.shape, np.uint8)
		rest[ys[~fixable], xs[~fixable]] = 1
		result = cv2.inpaint(result, rest, 3, cv2.INPAINT_TELEA)

	return result, count


def write(path, img, quality):
	ext = os.path.splitext(path)[1].lower()
	if ext in (".jpg", ".jpeg"):
		params = [cv2.IMWRITE_JPEG_QUALITY, quality]
	elif ext == ".png":
		params = [cv2.IMWRITE_PNG_COMPRESSION, min(quality, 9)]
	else:
		params = []
	# Write to a temporary file first so a failure never leaves a half-written image.
	tmp = f"{os.path.dirname(path) or '.'}/.darkSubtract-{os.getpid()}{ext}"
	if not cv2.imwrite(tmp, img, params):
		raise ValueError(f"unable to write '{path}'")
	os.replace(tmp, path)


def main():
	p = argparse.ArgumentParser(description="Subtract a dark frame and repair hot pixels.")
	p.add_argument("image")
	p.add_argument("dark")
	p.add_argument("--output", help="write here instead of overwriting the image")
	p.add_argument("--threshold", type=float, default=0.08,
		help="how much brighter than its neighbours a pixel in the dark frame must be to count as hot, as a fraction of full scale (default 0.08); 0 turns the repair off")
	p.add_argument("--quality", type=int, default=95, help="JPG quality or PNG compression (default 95)")
	p.add_argument("--verbose", action="store_true")
	a = p.parse_args()

	try:
		img = read(a.image)
		dark = match_dark(read(a.dark), img)
		if a.threshold > 0:
			result, count = subtract(img, dark, a.threshold)
		else:
			result, count = cv2.subtract(img, dark), 0
		write(a.output or a.image, result, a.quality)
	except Exception as e:
		print(f"darkSubtract.py: ERROR: {e}", file=sys.stderr)
		return 1

	if a.verbose:
		print(f"darkSubtract.py: repaired {count} hot pixels")
	return 0


if __name__ == "__main__":
	sys.exit(main())
