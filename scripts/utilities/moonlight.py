#!/usr/bin/env python3
"""
Moonlight for the Moon-dependent nighttime stretch.

    moonlight.py --latitude 48.14N --longitude 14.39E \
        --from AMOUNT MIDPOINT --to AMOUNT MIDPOINT [--time EPOCH]

Prints one line:  MOONLIGHT AMOUNT MIDPOINT

MOONLIGHT is 0 (no Moon) to 1 (full Moon high in the sky):
the illuminated fraction times the sine of the Moon's elevation, and 0 while the
Moon is below the horizon.  AMOUNT and MIDPOINT are interpolated linearly between the
"--from" values (used for no moonlight, i.e. the regular nighttime settings) and
the "--to" values (used for a full Moon at the zenith), rounded to whole numbers.

Uses astral, which Allsky already installs, so no extra download is needed.
Exits 1 with a message on stderr if the location is invalid.
"""
import argparse
import datetime
import math
import re
import sys

from astral import Observer
from astral import moon

LUNAR_CYCLE_DAYS = 28.0		# astral's moon.phase() runs from 0 to 27.99


def parse_coordinate(text, positive, negative):
	""" '48.14N', '-14.39', '14.39 W' -> signed float, or None. """
	match = re.fullmatch(r'\s*([+-]?\d+(?:\.\d+)?)\s*([A-Za-z]?)\s*', str(text))
	if not match:
		return None
	value = float(match.group(1))
	hemisphere = match.group(2).upper()
	if hemisphere == negative:
		value = -abs(value)
	elif hemisphere not in ('', positive):
		return None
	return value


def moonlight(latitude, longitude, when):
	observer = Observer(latitude=latitude, longitude=longitude)
	elevation = moon.elevation(observer, when)
	if elevation <= 0:
		return 0.0
	phase_angle = 2 * math.pi * moon.phase(when.date()) / LUNAR_CYCLE_DAYS
	illumination = (1 - math.cos(phase_angle)) / 2
	return max(0.0, min(1.0, illumination * math.sin(math.radians(elevation))))


def main():
	parser = argparse.ArgumentParser(description='Moonlight and the stretch for it.')
	parser.add_argument('--latitude', required=True)
	parser.add_argument('--longitude', required=True)
	parser.add_argument('--from', dest='start', nargs=2, type=float, required=True, metavar=('AMOUNT', 'MIDPOINT'))
	parser.add_argument('--to', dest='end', nargs=2, type=float, required=True, metavar=('AMOUNT', 'MIDPOINT'))
	parser.add_argument('--time', type=float, help='Unix time (default: now)')
	args = parser.parse_args()

	latitude = parse_coordinate(args.latitude, 'N', 'S')
	longitude = parse_coordinate(args.longitude, 'E', 'W')
	if latitude is None or longitude is None or abs(latitude) > 90 or abs(longitude) > 180:
		print(f'Invalid location: latitude "{args.latitude}", longitude "{args.longitude}".', file=sys.stderr)
		return 1

	when = datetime.datetime.fromtimestamp(args.time, datetime.timezone.utc) if args.time else datetime.datetime.now(datetime.timezone.utc)
	light = moonlight(latitude, longitude, when)
	amount = round(args.start[0] + (args.end[0] - args.start[0]) * light)
	midpoint = round(args.start[1] + (args.end[1] - args.start[1]) * light)
	print(f'{light:.3f} {amount} {midpoint}')
	return 0


if __name__ == '__main__':
	sys.exit(main())
