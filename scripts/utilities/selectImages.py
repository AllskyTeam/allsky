#!/usr/bin/env python3
"""
List the images of one day folder between a start and an end time.

    selectImages.py --dir IMAGES/YYYYMMDD --ext jpg --start S --end E \
        [--daynight FILE] [--latitude L --longitude L --angle A] --output FILE

Used by generateForDay.sh for the start/end time settings of the timelapse,
keogram and startrails.  Only images in the given folder are used, so the output
can cover less than a day, never more.

S and E can be empty (the first / last image), a time "HH:MM" or "HH:MM:SS", or:
    daytime_start, daytime_end, nighttime_start, nighttime_end
        Allsky's own day/night decision.  Taken from --daynight (lines of
        "image-name DAY|NIGHT", from the images database) when it has the folder's
        images, otherwise computed from the Sun's elevation with --angle.
    sunrise, sunset
        Computed for the location.
A time means its first occurrence after the folder's first image (for S) or after
the start (for E), so a window can cross midnight, e.g. 18:00 to 06:00.

Writes the selected images' full pathnames to --output, one per line, oldest first,
and prints a one-line summary.  Exit codes: 0 OK, 1 bad arguments, 2 no images.
"""
import argparse
import datetime
import os
import re
import sys

ALIASES_DAYNIGHT = ('daytime_start', 'daytime_end', 'nighttime_start', 'nighttime_end')
ALIASES_SUN = ('sunrise', 'sunset')
TIME_RE = re.compile(r'^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$')
NAME_RE = re.compile(r'image-(\d{14})\.')


def parse_coordinate(text, positive, negative):
	match = re.fullmatch(r'\s*([+-]?\d+(?:\.\d+)?)\s*([A-Za-z]?)\s*', str(text or ''))
	if not match:
		return None
	value = float(match.group(1))
	hemisphere = match.group(2).upper()
	if hemisphere == negative:
		value = -abs(value)
	elif hemisphere not in ('', positive):
		return None
	return value


def valid_spec(spec):
	spec = (spec or '').strip().lower()
	return spec == '' or spec in ALIASES_DAYNIGHT or spec in ALIASES_SUN or TIME_RE.match(spec) is not None


def local_naive(dt_utc):
	""" An aware UTC datetime as a naive local one, like the times in the file names. """
	return dt_utc.astimezone().replace(tzinfo=None)


class Selector:
	def __init__(self, images, daynight, latitude, longitude, angle):
		self.images = images			# [(datetime, path)], sorted
		self.daynight = daynight		# {basename: 'DAY'|'NIGHT'}
		self.latitude = latitude
		self.longitude = longitude
		self.angle = angle

	def _observer(self):
		from astral import Observer
		if self.latitude is None or self.longitude is None:
			raise ValueError('the location (latitude and longitude) is needed for this')
		return Observer(latitude=self.latitude, longitude=self.longitude)

	def _first_after(self, candidates, reference):
		after = sorted(c for c in candidates if c is not None and c >= reference)
		return after[0] if after else None

	def _sun_times(self, which, reference):
		from astral import sun, SunDirection
		observer = self._observer()
		candidates = []
		for days in (-1, 0, 1, 2):
			date = reference.date() + datetime.timedelta(days=days)
			try:
				if which == 'sunrise':
					t = sun.sunrise(observer, date)
				elif which == 'sunset':
					t = sun.sunset(observer, date)
				else:
					direction = SunDirection.SETTING if which == 'setting' else SunDirection.RISING
					t = sun.time_at_elevation(observer, self.angle, date, direction)
				candidates.append(local_naive(t))
			except ValueError:
				pass		# the Sun doesn't get there that day (polar day or night)
		return candidates

	def _daynight_time(self, alias, reference):
		""" From the images' own DAY/NIGHT classification, or None if it's not known. """
		classified = [(t, self.daynight.get(os.path.basename(p))) for t, p in self.images]
		classified = [(t, c) for t, c in classified if c in ('DAY', 'NIGHT')]
		if not classified:
			return None
		kind = 'NIGHT' if alias.startswith('nighttime') else 'DAY'
		times = [t for t, c in classified if c == kind]
		if not times:
			return None
		return times[0] if alias.endswith('_start') else times[-1]

	def resolve(self, spec, reference):
		""" The datetime for a start/end setting, or None if it's empty. """
		spec = (spec or '').strip().lower()
		if spec == '':
			return None
		match = TIME_RE.match(spec)
		if match:
			hour, minute, second = int(match.group(1)), int(match.group(2)), int(match.group(3) or 0)
			candidates = [datetime.datetime.combine(reference.date() + datetime.timedelta(days=d), datetime.time(hour, minute, second))
						  for d in (0, 1)]
			return self._first_after(candidates, reference)
		if spec in ALIASES_DAYNIGHT:
			result = self._daynight_time(spec, reference)
			if result is not None:
				return result
			# No classification: the Sun crossing Allsky's day/night angle.
			which = 'setting' if spec in ('nighttime_start', 'daytime_end') else 'rising'
			return self._first_after(self._sun_times(which, reference), reference)
		if spec in ALIASES_SUN:
			return self._first_after(self._sun_times(spec, reference), reference)
		raise ValueError(f'unknown time "{spec}"')


def main():
	parser = argparse.ArgumentParser(description='List the images of a day folder between two times.')
	parser.add_argument('--dir', required=True)
	parser.add_argument('--ext', default='jpg')
	parser.add_argument('--start', default='')
	parser.add_argument('--end', default='')
	parser.add_argument('--daynight', default='', help='file with "image-name DAY|NIGHT" lines')
	parser.add_argument('--latitude', default='')
	parser.add_argument('--longitude', default='')
	parser.add_argument('--angle', type=float, default=-6.0)
	parser.add_argument('--output', required=True)
	args = parser.parse_args()

	for spec in (args.start, args.end):
		if not valid_spec(spec):
			print(f'Invalid time "{spec}": use HH:MM, HH:MM:SS, sunrise, sunset, '
				  'daytime_start, daytime_end, nighttime_start or nighttime_end.', file=sys.stderr)
			return 1

	images = []
	for name in os.listdir(args.dir):
		match = NAME_RE.match(name)
		if match and name.endswith('.' + args.ext):
			images.append((datetime.datetime.strptime(match.group(1), '%Y%m%d%H%M%S'), os.path.join(args.dir, name)))
	images.sort()
	if not images:
		print(f'No images in "{args.dir}".', file=sys.stderr)
		return 2

	daynight = {}
	if args.daynight and os.path.isfile(args.daynight):
		with open(args.daynight) as file:
			for line in file:
				parts = line.split()
				if len(parts) >= 2:
					daynight[os.path.basename(parts[0])] = parts[1].upper()

	selector = Selector(images, daynight,
						parse_coordinate(args.latitude, 'N', 'S'), parse_coordinate(args.longitude, 'E', 'W'), args.angle)
	try:
		start = selector.resolve(args.start, images[0][0]) or images[0][0]
		end = selector.resolve(args.end, start) or images[-1][0]
	except ValueError as e:
		print(f'Unable to work out the times: {e}.', file=sys.stderr)
		return 1

	selected = [path for t, path in images if start <= t <= end]
	with open(args.output, 'w') as file:
		for path in selected:
			file.write(path + '\n')

	print(f'{len(selected)} of {len(images)} images, {start:%Y-%m-%d %H:%M:%S} to {end:%Y-%m-%d %H:%M:%S}')
	return 0 if selected else 2


if __name__ == '__main__':
	sys.exit(main())
