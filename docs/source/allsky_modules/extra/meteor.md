# allsky_meteordetect

A **temporal meteor detection** module for [Allsky](https://github.com/AllskyTeam/allsky).

Unlike single-frame streak detectors, this module tells meteors apart from
aircraft and satellites — the thing single-frame detectors fundamentally cannot do.

## Why another meteor module?

The detector, historically, bundled with Allsky — and the one in indi-allsky — look for straight
lines in a **single image** (Canny → Hough). That approach cannot distinguish a
meteor from an aircraft, a satellite, a cloud edge or a power line, because in one
frame they all look like a bright streak. The result is either constant false
alarms or a threshold so high that real meteors are missed.

The physical thing that makes a meteor a meteor is **transience**: it is present in
*one* frame. A satellite or aircraft moves across *several consecutive* frames.
This module uses that.

## How it works

```
frame N-1, frame N ─► difference ─► threshold ─► soft mask
      └► connected components + PCA ─► streaks (length + elongation)
            │
            ▼  classify against neighbouring frames
   streak continues a PROGRESSING track   →  satellite / aircraft   (rejected)
   streak repeats at the SAME location     →  disappearance of a meteor (de-duped)
   isolated, transient streak              →  meteor candidate → confirmed next frame → saved
```

Key points:

- **Frame differencing** removes stars and static clouds, so — unlike single-frame
  detection — the sky background does not generate lines.
- **PCA streaks** (connected components + principal-axis length/elongation) are
  robust against gaps and reject blobby cloud brightening.
- **Deferred confirmation:** a candidate is held for one frame and only saved if
  the next frame shows no progressing continuation — so a satellite is rejected
  even on its *first* appearance (a live detector has no future frames).
- **Soft, feathered mask edge** (a trick borrowed from indi-allsky) so the mask
  boundary itself is never detected as a streak.
- **Cloud and twilight gates** skip frames that are too bright or changing too much.

## Requirements

- Allsky 2025 or later, installed with the **Module Package Manager**. (The module also
  runs on Allsky 2024, copied in by hand — see the
  [module's own repository](https://github.com/benhartwich/allsky-meteordetect).)
- Python packages already present in the Allsky virtualenv: `opencv-python`, `numpy`;
  the calibration tool also uses `scipy`.

## Installation

**1. Install it** from the WebUI's Module Package Manager (*Meteor Detection (temporal)*).
It installs the module into `~/allsky/config/myFiles/modules/` and its bundled files —
`allsky_fisheye.py`, `stars.json` and the tools below — into
`~/allsky/config/myFiles/modules/moduledata/data/allsky_meteordetect/`.
The tools run with Allsky's Python; the examples below use

```bash
PY=~/allsky/venv/bin/python3
T=~/allsky/config/myFiles/modules/moduledata/data/allsky_meteordetect/tools
```

**2. Add it to the night flow.** Open the Module Manager in the WebUI and switch to the
**night** flow — the module declares `"events": ["night"]`, so it deliberately does not
appear under day. **“Meteor Detection (temporal)”** is then in the list of available modules.
Allsky's own single-frame module is called plain *“Meteor Detection”* — that is not this
one. Running both is possible but redundant; if you do, keep this one directly after
*Load Image* so the other's debug annotations never end up in the saved meteor images.

**3. Put it directly after *Load Image*.** The module saves the frame as it stands at its
position in the flow, so anything running before it — the overlay, for instance — ends
up in the saved meteor images.

## Building a detection mask

Trees, buildings and the lens vignette should be excluded, or wind-blown leaves
produce endless false positives. `tools/build_mask.py` builds the mask
automatically from your own daytime images:

```bash
$PY $T/build_mask.py \
    --images ~/allsky/images \
    --nights 20260703 20260704 20260705 \
    --out meteor_mask.png \
    --preview preview.jpg
```

Copy `meteor_mask.png` into `~/allsky/config/overlay/images/` and select it as the
module's **Detection Mask**.

You can also build a mask manually using the built in [mask editor](/allsky_guide/overlays/interface.md)

!!! warning "Auto created masks cannot be edited"

    Unlke masks created in the mask editor auto generated masks cannot be edited

**A building as bright as the sky** is found by its outline. Averaged over many
frames the sky is smooth, while buildings, trees and poles keep sharp edges, so the
tool fills the sky outward from the image centre without crossing such an edge.
Whatever it can't reach, that rises from the edge of the image and has some area to
it, is an obstruction, however bright. Overlay text isn't: it is only thin strokes.
`--no-edges` turns this off. For anything it still misses, paint it black in the
mask, for example with the **Mask Editor** in Allsky's Overlay Editor (Expert mode),
or in any image editor.


**Method.** Obstructions are *persistently dark silhouettes*. For every pixel the
tool measures, across many daytime frames, how often it is markedly darker than the
sky (referenced to the bright image centre). Sky is rarely dark, trees almost
always are — a far more robust separator than brightness or texture, both of which
fail because tree interiors are smooth and averaging washes out their texture.

## Configuration

| Setting | Default | Meaning |
|---|---|---|
| Detection Mask | `meteor_mask.png` | White = sky to analyse, black = ignore |
| Min Streak Length | `50` px | Minimum streak length — the main lever against short star artifacts |
| Difference Threshold | `22` | Brightness increase over previous frame to count as “new” |
| Min Elongation | `5.0` | Length/width ratio (rejects round star blobs and clouds); real meteors here measured ≥7 |
| Max Streak Area | `6000` px | Larger regions = cloud brightening |
| Cloud Skip | `2.0` % | Skip frame if more than this share of sky changed |
| Mask Edge Feather | `35` px | Soft mask fade so the edge is not detected |
| Reject Dashed Trails | on | Reject a long streak broken into many bright/dark segments — a tumbling satellite or strobing aircraft |
| Dash Segments | `10` | Segment count that marks a streak as dashed (real meteor ≤5, a dashed satellite scored 19) |
| Dash Min Length | `120` px | Only test streaks at least this long for a dashed pattern; short meteors are exempt |
| Reject Fragmented Trails (arm) | off | Arm the fragmented-trail veto. **Off = shadow mode**: the collinear-fragment metric is measured and logged (`frag_n`/`frag_ext`, `frag-shadow`) but nothing is vetoed. Before arming, check what your real meteors score — see below |
| Fragment Segments | `5` | Collinear diff fragments beyond a streak's ends that mark it as the head of a fragmented dashed trail. Real meteors are **not** always 0: here they reached 4, satellite trails 3–11 — see below |
| Fragment Min Length | `120` px | Only test streaks at least this long for a collinear fragmented tail |
| Reject Edge Glow (arm) | off | Reject a long, fat streak with **both** ends on the mask border — horizon or lens-rim glow leaking through the feathered edge. **Off = shadow mode**: logged as `edge-shadow`, and every saved meteor records `edge_d`. See below |
| Edge Margin | `50` px | Both ends closer than this to the mask border count as "on the border" |
| Edge Glow Max Elongation | `10` | Only fatter streaks can be edge glow (glow here 5–8, real streaks at the border over 10) |
| Edge Glow Min Length | `80` px | Only longer streaks; spares a short meteor vanishing behind a tree at the border |
| Reject Satellites/Aircraft | on | Discard progressing tracks |
| Scintillation Guard | on | On very clear nights, if a frame has more than *Scintillation Max* streaks keep only a clearly dominant one |
| Scintillation Max | `8` | Streak count that marks a scintillation-dominated frame |
| Reject Recurring Positions | on | Reject a spot that keeps firing across frames (scintillation/bloom/trailed star/reflection); a real meteor appears once |
| Recurrence Frames | `3` | Earlier frames at the same spot (~55 px, ~25 min) needed to call it recurring — keep ≥3 |
| Reject Star-Trail Orientation | on | Reject a streak parallel to the local diurnal star-trail direction (needs the fisheye calibration); fireballs >130 px exempt |
| Star-Trail Tolerance | `12`° | How close to the trail direction counts as a trailed star |
| Reject Bright-Star Scintillation | on | Reject a short streak sitting on a catalogue bright star — a star twinkling brighter between frames makes a compact diff blob at its position that mimics a meteor. Needs the fisheye calibration + `stars.json`; fireballs >130 px exempt |
| Star-Match Radius | `16` px | How close a streak's centre must be to a projected catalogue star to count as that star. Size it to the calibration RMS (~4–6 px) plus a few px of blob offset |
| Star Magnitude Limit | `5.0` | Only stars brighter than this are used; fainter stars rarely brighten enough to trigger, and including them risks vetoing a real meteor |
| Glare Spike Filter | on | Reject a streak that points straight away from a bright, saturated light (the Moon, a street light): its lens and dome spikes turn as it moves and show up in the frame difference |
| Glare Reach | `5` radii | How far from the light, in radii of its saturated disc, a streak can be a spike |
| Glare Angle Tolerance | `6`° | How close to the direction away from the light a streak must point |
| Traffic Filter (arm) | off | Reject a streak that lies along the track a known satellite or aircraft took during that exposure. Needs the **Sky Traffic** module in the same flow. **Off = shadow mode**: logged as `traffic-shadow` with the name, and the saved meteor records `traffic`. See below |
| Great-Circle Filter (arm) | off | Reject a streak that lies on one great circle with a streak in the image before or after, however far apart: a satellite or aircraft that crossed the highest part of its path between two exposures. Needs the fisheye calibration. **Off = shadow mode**: logged as `circle-shadow`, and the saved meteor records `circle`. See below |
| Upload to Remote Website | on | Upload each hit via Allsky's `upload.sh` |
| Save Rejected-Candidate Crops | on | Save a labelling crop of every *rejected* streak (into `vetoed/`) as the negative examples for a future classifier |
| Browse in the Allsky WebUI | on | Also file each meteor under `images/<day>/meteors/` so the WebUI's **Meteors** page can browse it day by day — see [Output](#output) |
| Save Marked Copy | on | Extra copy with brackets *around* the streak, plus its thumbnail (the WebUI's *Use Marked Meteors* option needs both) |

**Clear nights are the hard case.** Star scintillation and slight frame shake make
bright stars flicker into short streaks that share a meteor's appear-then-disappear
signature. The defenses are, in order of impact: geometry (a real meteor is long and
thin — raise *Min Streak Length* / *Min Elongation* if a clear night still produces
false positives), the scintillation guard, and same-location confirmation. There is
no single perfect filter; tune the geometry to your sky. With a fisheye
calibration, the **bright-star scintillation veto** adds a targeted defense: it
rejects a short blob that sits exactly on a catalogue bright star, which is what a
twinkling star produces — geometry alone can't tell that blob from a faint short
meteor, but its position on a known star can.

## Fisheye calibration & geometric radiant matching (optional)

With a calibrated fisheye projection the module can attribute each meteor to the
**shower whose radiant its streak actually points back to** — real geometry, not
just "which showers are active tonight".

`tools/calibrate_fisheye.py` fits the camera model (optical centre, radial
distortion, rotation, handedness) from clear night frames. It identifies the stars
itself; give it two frames a few hours apart:

```bash
$PY $T/calibrate_fisheye.py image-A.jpg image-B.jpg --out ~/allsky/config/myFiles/modules/calibration.json --preview check.jpg
```

If it can't find a clear match (clouds, a short exposure, or two solutions that fit
about equally well) it says so, writes nothing, and lists the bright stars that were
up. Then identify **two bright stars** in the first frame and give their pixel positions:

```bash
$PY $T/calibrate_fisheye.py image-A.jpg --list-stars      # which bright stars were up, and where
$PY $T/calibrate_fisheye.py image-A.jpg image-B.jpg --star vega 2828 1213 --star altair 2527 1976 \
    --out ~/allsky/config/myFiles/modules/calibration.json --preview check.jpg
```

Read the two stars' pixel positions in any image viewer that shows the cursor position,
on the full-size frame. Both tools only read Allsky's files; `calibrate_fisheye.py`
writes nothing but `--out` and `--preview`, and `align_overlay.py` changes nothing
without `--apply`. `align_overlay.py` uses an installed calibration or the one given
with `--calibration`, and refuses a calibration made at another site.

Two stars fix centre, scale and rotation. To find them without help the tool does what
astrometry does: every pair of bright points in the frame against every pair of bright
catalogue stars gives a guess, scored by how many other bright stars then land on a
point. It refines the best guesses and accepts the winner only if it fits at least 12
stars to better than 0.6° and no different solution comes within 70 % of its star
count. It tries the frames in turn and starts from the first clear winner.

From there the tool computes where every bright catalogue star (Vmag ≤ 3) stood at each
frame's time and place, looks for it in a window around that prediction, and fits the
lens by least squares — shrinking the window from 100 to 20 px as the model improves. A
star is used only when the brightest point in its window clearly outshines everything
else there, so it cannot be confused with a neighbour. Clicks 10 px off, or any of three
different star pairs, all converge to the same solution. `--seed calibration.json`
starts from an earlier calibration instead.

On the author's camera, 21 night frames from 8 nights and one day frame: 10 night
frames were identified automatically, some with the full Moon up or thin cirrus. From
each single frame the lens came out within 0.3° of the calibration below over most of
the sky. The other 11, overcast or only 2 s exposures, and the day frame were refused.
None was identified wrongly. Run automatically on the two frames below, the tool gives
the same calibration to 0.5 px.

Here, from two frames four hours apart: **77 bright stars, 0.28° RMS (5 px)** from the
zenith down to 15° altitude. Check `--preview`: every green circle should sit on a star.

> **Earlier calibrations were wrong away from the zenith.** Until v0.5.8 the fit matched
> stars to their *nearest* detection in a deep catalogue. In a dense Milky Way field a
> wrong model still finds a neighbour within a few pixels for almost every star, so it
> reported 0.15° over 317 stars while placing stars at 30° altitude 470 px off. If you
> made a `calibration.json` with an earlier version, make it again.

`allsky_fisheye.py` then provides `pixel_to_altaz` / `altaz_to_pixel` and
`match_radiant`: a meteor travels along a great circle whose backward extension
passes through its radiant, so the module tests which active shower's radiant lies
on that circle (and above the horizon).

The same projection also drives the **bright-star scintillation veto**: a bundled
Hipparcos subset (`stars.json`, Vmag < 6) is projected to pixels for each frame's
time, and a short candidate that lands within *Star-Match Radius* of a catalogue
star brighter than *Star Magnitude Limit* is rejected as a twinkling star rather
than a meteor. `stars.json` is bundled; without a calibration the veto is silently
skipped. **Accuracy matters:** size the radius to
your calibration RMS — regenerate `calibration.json` if bright stars drift off their
catalogue positions, or the veto will either miss scintillation or clip real meteors.

Put `calibration.json` beside the module, in `~/allsky/config/myFiles/modules/` —
not in the data folder, which the package manager replaces on every update. Without it,
radiant matching is silently skipped. **The calibration is per-camera** — make it for
your own camera with `calibrate_fisheye.py`; the package does not ship one.

## Output

Each hit is written to **two** places, because the website and the WebUI want
different layouts.

**Website folder** (`meteors/`, the source for the remote upload and the per-night
charts):

- **`meteors-<timestamp>.jpg`**, named like the image it is in (`image-<timestamp>.jpg`, the start of the exposure), plus a thumbnail in `meteors/thumbnails/` —
  picked up automatically by Allsky's meteor gallery page. **The gallery image keeps
  the meteor's true colours, untouched.**
- **`marked/meteors-<timestamp>-marked.jpg`** and its thumbnail in
  `marked/thumbnails/`, when *Save Marked Copy* is on. They are in a subfolder
  so the Website's Meteors page, which lists every image in the folder, doesn't
  show each meteor twice. Marked copies saved by earlier versions next to the
  gallery images can be deleted:
  `rm ~/allsky/html/allsky/meteors/*-marked.jpg ~/allsky/html/allsky/meteors/thumbnails/*-marked.jpg`
  (the WebUI's copies under `images/<day>/` are separate and stay).
- **`meteors.json`** — a rolling log of
  `{time, file, length, angle, elong, peak, frag_n, frag_ext, showers, radiant}`
  for later statistics (`showers` = active by date, `radiant` = geometric
  attribution if calibrated, `frag_n` = collinear-fragment shadow metric).
- Optional remote-website upload of each hit.

**Allsky WebUI folder** (under `images/<day>/`, when *Browse in the Allsky WebUI*
is on) — the layout the WebUI's **Meteors** page reads:

```
images/<day>/meteors/meteors-<timestamp>.jpg
images/<day>/meteors/meteors-<timestamp>-marked.jpg     (Save Marked Copy)
images/<day>/meteors/meteors-<timestamp>.json
images/<day>/meteorsthumbnails/meteors-<timestamp>.jpg
images/<day>/meteorsthumbnails/meteors-<timestamp>-marked.jpg
```

- **`meteors-<timestamp>.json`** — a sidecar holding *only that image's* streaks
  (same fields as the rolling log). The WebUI reads one file per image rather than
  scanning a rolling log, so the sidecar exists alongside it, not instead of it.
- **Thumbnails sit in the sibling `meteorsthumbnails/`**, not in a `thumbnails/`
  subfolder of `meteors/` — that is where the WebUI's Meteors page reads them. The
  website folder above keeps its own `meteors/thumbnails/`, which its gallery page
  expects.

The day folder follows Allsky's own convention: it is the night's *evening* date
(`DATE_NAME`, 12-hour offset), while the file name carries the real timestamp. A
meteor at 03:15 on the 19th therefore lands in `images/20260918/` as
`meteors-20260919031514.jpg` — exactly like Allsky's own `image-*.jpg` files.

### Variables

Each frame publishes its result as Allsky variables — in the WebUI's variable list,
usable in overlays, and passed on by modules such as MQTT. The first four use **the same
names as Allsky's built-in meteor module**, so an overlay or a Home Assistant feed built
on those keeps working when you switch to this module:

| Variable | Meaning |
|---|---|
| `AS_METEORCOUNT` | meteors confirmed on this frame |
| `AS_METEORIMAGE` | file name of the meteor image saved on this frame, empty if none |
| `AS_METEORIMAGEPATH` | full path of that image under `images/<day>/meteors/` |
| `AS_METEORIMAGEURL` | WebUI URL of its thumbnail in `meteorsthumbnails/` |
| `AS_METEORMOVING` | streaks rejected as satellites/aircraft on this frame |
| `AS_METEORVETOED` | streaks rejected by the other filters on this frame |

One difference to the built-in: its image values point at the frame it analysed. Here a
meteor is only confirmed one frame later, so they point at the **saved meteor image**
instead. With *Browse in the Allsky WebUI* off, the path points into the website folder
and the URL stays empty.

Run only one of the two meteor modules: both publish `AS_METEORCOUNT`, and whichever
runs last wins.

### Why true colour matters

Meteor colour encodes composition — green from magnesium/oxygen, yellow/orange from
sodium/iron, blue-white for fast trails. The gallery image is therefore never
painted over; the optional marked copy draws brackets *around* the streak, never on
it.

### Arming the fragmented-trail veto

The veto ships in shadow mode: it measures `frag_n` on every detection and writes it to
`meteors.json`, but rejects nothing. That record is what tells you whether arming it is
safe. On this camera, two months of saved detections (107) gave:

| frag_n | detections | inspected by eye |
|---|---|---|
| 0–2 | 96 | — |
| 3 | 7 | 4 satellite trails or artefacts, 1 unclear, **2 real meteors** |
| 4 | 2 | 1 dawn contrail, **1 real meteor** |
| 6, 11 | 2 | both satellite trails |

So at the original threshold of 3 it would have removed seven false detections and three
real meteors; the scores simply overlap. At **5** it removes the two clearest satellite
trails and no meteor, which is why `frag_min` now defaults to 5. Check your own record
before arming — this lists every long detection with its score:

```bash
python3 -c 'import json, os; [print(e["time"], "frag_n=%s" % e["frag_n"], "len=%d" % e["length"]) for e in json.load(open(os.path.expanduser("~/allsky/html/allsky/meteors/meteors.json"))) if e.get("frag_n", 0) >= 3 and e["length"] >= 120]'
```

and `tools/replay_night.py <night> --set frag_filter=true` shows what it would have
rejected on a saved night.

### Arming the edge-glow veto

About a quarter of the detections saved here touched the border of the detection mask.
Looking at them, two kinds were mixed together:

* **Real streaks** — satellites and meteors — *cross* the border: one end sits at it, the
  other points into the sky, and the trail visibly carries on behind the mask. They are
  thin: elongation 10 to 47.
* **Edge glow** — the brightening rim of the fisheye, horizon glow, a lit tree edge — lies
  *along* the border as a diffuse band. Both ends sit on the border, and it is fat:
  elongation 5 to 8.

The veto rejects the second kind: at least 80 px long, elongation below 10, and both ends
within 50 px of the border. Over two months of detections here that matched 9, all
inspected and all edge glow, and not one real streak. The result did not change between
50 and 60 px, or between 70 and 80 px minimum length. The length limit is there for one
case in particular: a short, bright streak that disappears behind a tree right at the
border, which may well be a meteor and is left alone.

It ships in shadow mode, like the fragmented-trail veto. Every saved meteor records
`edge_d`, the distance of its farther end from the border, so you can see what it would
catch on your sky first — or replay a night with `--set edge_filter=true`.

### Arming the great-circle filter

The moving-track filter connects a streak with one in the next or previous image only if
the two are at most 400 px apart. A satellite or aircraft that passes high overhead can
cross the highest part of its path in the pause between two exposures. It then leaves
two streaks far apart, in different parts of the sky, and each looks like a meteor. A
user's camera saved one this way: 26° in the north-west in one image, 24° in the east in
the next, 66° apart.

Seen from the camera, anything that moves in a straight line through space moves along a
great circle. With a fisheye calibration the filter fits one great circle through both
streaks together, through their ends and centres. It rejects the candidate when every
point lies within 1.2° of that circle and the other streak lies further along it, at
most 120° away. Both streaks must be at least 6° long. Two short streaks almost always
fit some common circle: without that limit, 4 of 10 real meteors on one night matched a
short streak in the next image.

Replayed over 7 nights on the author's camera (14 to 27 September), the filter matched 8
of the 26 streaks the module would have saved as meteors. All 8 were long, evenly bright
satellite trails, including two pairs where the same object is in two images in a row.
None of the other 18 was touched. On the user's two streaks it matches; with the second
streak shifted sideways by 100 px (about 3°) it no longer does.

**Short pieces.** A camera that takes a 10 s exposure about once a minute sees an
aircraft as short pieces of 3–5°, far apart. Those are too short for the circle alone.
They still count when the gap between the two pieces matches the object's speed: the
faster piece's length over its exposure, times the time between the two exposures,
must give 0.5 to 2 times the gap. (The faster piece gives the speed, because a piece
that fades or leaves the sky covers only part of its exposure.) The filter works out
which image each piece is in from the two differences, and it takes the exposure
start and length from Allsky (`AS_TIMESTAMP`, `AS_EXPOSURE_US`).

Tested on a user's camera (6–15 s exposures every 66 s, frames before and after each
saved meteor), it linked a short "meteor" to the bright dashed aircraft trail in the
image before it (gap 0.9 times the expected distance), and a later piece of another
aircraft. The two real meteors in those sequences were not linked; one sat on a common
circle with an unrelated piece, but its gap was 3.5 times too large. On the author's 7
nights it marked no additional streak and no real meteor.

It ships in shadow mode like the others: check the `circle` entries of your saved
meteors before you arm it.

### Arming the traffic filter

The moving-track filter only catches a satellite or aircraft that leaves a streak in two
frames in a row. A short glint of a satellite, a trail that ends in the Earth's shadow,
or an aircraft whose lights don't blink appears in one frame only, like a meteor.

The **Sky Traffic** module knows where every catalogued satellite, and with an ADS-B
source every aircraft, was during each exposure. Put it in the same night flow. It
writes the tracks of the last images to `allsky_skytraffic_tracks.json` in Allsky's tmp
folder, and this filter checks every candidate against the tracks of the image it
appeared in. A candidate is on a track when its centre lies within Sky Traffic's
**Match tolerance** (0.6°) of the part the object covered while sunlit, it runs along
it within 8°, and it is no longer than that part. Without Sky Traffic, or without a
lens calibration, nothing happens.

Tested on the author's camera, 25 meteors saved from 15 to 27 September and 216 rejected
streaks:

* One "meteor", 61 px long at 05:37 on 27 September, lies 4.7 px from the track of the
  weather satellite FENGYUN 3D and runs along it. The satellite's track in that exposure
  was 257 px long, so the streak was a short glint.
* To see how often a streak lies on a track by chance, the same check ran with the
  times shifted by ±5 to ±30 minutes (9 shifts). About 400 satellite tracks cross the
  image in each exposure, and 3 of the 225 shifted meteor checks matched, each 1–9 px
  from a Starlink or Qianfan track. One of them was a 214 px streak on a 150 px track,
  which the length rule rejects; that leaves 2 of 225, **about 1 in 110 meteors**.
* A replay of that morning with Sky Traffic running rejects the glint as `satellite`,
  `FENGYUN 3D`, and in shadow mode saves it with `"traffic": "FENGYUN 3D"`.

So on this sky about 1 in 110 real meteors would also be rejected. That is why it ships
in shadow mode: look at the `traffic` entries of your saved meteors, and at the crops in
`vetoed/`, before you arm it.

### Noisy cameras and curved streaks

Two fixes came from a user's RPi HQ camera in Australia (30 s at gain 16, a long
fireball near the edge of a 1.56 mm lens):

- **Sensor noise.** About 5.7 % of single pixels changed by more than the Difference
  Threshold between any two frames. The cloud gate took that for cloud and skipped every
  frame, and the noise merged with the fireball into a shapeless blob. When a 3×3 median
  removes most of what is over the threshold (single pixels do, clouds, streaks and
  twinkling stars don't), the frame is treated as noisy and analysed after the median:
  5.7 % became 0.8 %, and the 563 px fireball was found with no noise streaks around it.
  Other frames are analysed as before, so a 1 px meteor on a normal camera isn't thinned
  out.
- **Curved streaks.** The dash count sampled along the straight line between a streak's
  ends. The fisheye bent the fireball up to 12 px away from that line in the middle, the
  dip looked like a gap, and noise at its edges made 18 "dashes". The streak's bend is
  now fitted from its pixels and followed.

Replaying 7 of the author's nights gives exactly the same meteors and rejections as
before. On the user's sequences, the fireball and a meteor from a second camera are
saved; an aircraft, insects and moonlit cloud are not.

## Testing without waiting for a clear night

Meteors are rare and clear nights rarer, so "is it working, are my settings right" can
otherwise take weeks to answer. `tools/replay_night.py` runs the detector over a night
Allsky has already saved and reports what it would have confirmed and rejected, and why:

```bash
$PY $T/replay_night.py 20260917                      # a night folder under images/
$PY $T/replay_night.py 20260917 --compare            # vs. what was saved live that night
$PY $T/replay_night.py 20260917 --set min_length=60  # try a setting without changing it
```

It tests the **installed** module with the settings of your night flow — the same code and
the same fisheye calibration that run live — and only the frames Allsky would have
treated as night. Everything happens in a sandbox folder it prints at the start: no
detector state, no settings, no website and no overlay variables are touched, and nothing
is uploaded. The marked copies it saves show exactly what was detected.

**How close it gets.** On 2026-09-17 here, the replay found 4 of the 6 meteors the module
saved live that night and reported 3 more, which on inspection were two satellite
trails and a cloud wisp. So it is somewhat *more* eager than a live night, for two
reasons:

* It replays the images Allsky **saved**, which have the overlay on them and have been
  JPEG-compressed once more. Live, the module sees the frame before the overlay module
  runs (with this module right after *Load Image*).
* The detector's memory of recurring hot spots starts empty, as on a new install.

That makes it a good tool for *comparing* settings on the same night, and for checking
that detection works at all — not an exact re-run of a live night.

Use `--compare` to see which meteors were found live, in the replay, or both. Live stamps
record when a frame was *processed*, replay stamps when it was *captured*, so the tool
pairs a live stamp with the latest replayed meteor up to one maximum exposure plus a
margin before it.

## Aligning the Website's constellation overlay

Allsky's documentation calls aligning the constellation overlay "a trial-and-error effort
that takes time": guess the overlay's size, nudge its offsets, rotate it, reload, repeat.
With a fisheye calibration (see above) there is nothing left to guess.
`tools/align_overlay.py` computes all five settings — and the projection that fits your
lens best — from the plate solve:

```bash
$PY $T/align_overlay.py                               # print the settings, change nothing
$PY $T/align_overlay.py --preview image-XXXX.jpg      # mark stars vs. overlay on a night frame
$PY $T/align_overlay.py --apply                       # write them into the local Website
$PY $T/align_overlay.py --config ~/allsky/config/remote_configuration.json   # remote Website
```

**How it works.** The overlay is drawn by *virtualsky*, whose zenith-centred projections
are `polar` (equidistant), `fisheye` (equisolid — Allsky's default) and `ortho`. The
calibration's centre and rotation carry over exactly. Its radial law generally matches
none of the three, so the tool fits the radius over the sky your camera actually sees,
tries all three projections, and reports the error that remains.

**How good it gets.** Here the lens turns out to be close to equisolid, so Allsky's
default `fisheye` projection fits best: **0.30° RMS** over the visible sky, under 0.7°
over 95 % of it, 1.3° at worst near the edge (`polar` 1.2°, `ortho` 2.5°). So for this
lens virtualsky needs no new projection, only the right size, offsets and rotation.

**Verified in a browser, against real stars.** The real `virtualsky.js`, run in headless
Chromium with these settings, puts the bright stars of a frame from 2026-09-17 **0.46°
RMS** from where they actually are in the image (measured star centres, not the model).

One limit: virtualsky always draws east on the left. A calibration with east on the
right (`flip: +1`) cannot be matched by any setting; the tool says so instead of
writing something wrong.

## Credits & inspiration

- [Allsky](https://github.com/AllskyTeam/allsky) by Thomas Jacquin and the Allsky team.
- [indi-allsky](https://github.com/aaronwmorris/indi-allsky) by Aaron Morris — the
  feathered-mask trick and the SQM/chart approach on the roadmap are inspired by it.
- Built for [astronomy.garden](https://astronomy.garden).

## License

MIT — see the [module's repository](https://github.com/benhartwich/allsky-meteordetect).
