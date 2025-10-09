#!/usr/bin/env python3
import sys
import os

# Ensure stdout is line-buffered so logs appear immediately (useful with threads/processes)
try:
    sys.stdout.reconfigure(line_buffering=True, write_through=True)
except Exception:
    pass

import cv2
import numpy as np
import glob
import re
import time
from datetime import datetime
from typing import List, Tuple, Optional, Dict
from multiprocessing import Pool
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
import functools
import builtins

# Force all print() calls to flush by default (no log buffering surprises)
print = functools.partial(builtins.print, flush=True)


# =========================== Config ===========================

@dataclass
class StarTrailBuilderConfig:
    input_dir: str
    output: str = "startrail.jpg"
    regex: str = r"^image-\d{14}\.jpg$"
    # Brightness threshold in 0..1 (None disables brightness filtering)
    max_brightness: Optional[float] = None
    # After filtering & sorting chronologically, limit to first N usable frames (test mode)
    test: Optional[int] = None
    # Comet-trail mode: decay previous stack before max-compositing the next frame
    comet_trails: bool = False
    comet_decay: float = 0.98
    # Optional masks (white=keep, black=mask)
    final_mask: Optional[str] = None
    cloud_mask: Optional[str] = None
    # How to apply final_mask: at the end to the final image, per-frame during stacking, or off
    mask_mode: str = "final"  # "final" | "per-frame" | "off"
    # Postprocess: apply gamma or median background subtraction (or none)
    postprocess: str = "gamma"  # "gamma" | "median" | "none"
    gamma: float = 0.6
    # Video snapshot options (writes a frame every video_step stacked frames)
    video_path: Optional[str] = None
    video_fps: int = 30
    video_step: int = 10
    video_codec: str = "mp4v"
    # Save intermediate images every N frames (after postprocess + label + final-mask)
    save_intermediate: Optional[int] = None
    intermediate_dir: str = "intermediates"
    # Overlay label on the top-left
    label: Optional[str] = None
    label_color: str = "#FFFFFF"
    label_bg: str = "#000000"
    label_scale: float = 0.7
    label_thickness: int = 2
    label_margin: int = 8
    label_pad: int = 4
    label_utf8: bool = False
    label_font: Optional[str] = None
    label_font_size: int = 20
    # Parallelism (processes) for final stacking. Filtering uses threads.
    parallel: int = 1
    # Legacy; superseded by log_level but retained for compatibility
    verbose: bool = False
    # Log levels:
    # 0=critical only, 1=stage headings, 2=headings+counts (and filter block-of-10 summaries),
    # 3=level 2 + stacking progress every 10 frames, 4=per-file detail
    log_level: int = 2
    # Process niceness (priority). >0 lowers priority (safe), <0 raises (root required)
    nice: Optional[int] = None
    # Trail smoothing
    smooth_trails: bool = False
    smooth_method: str = "gaussian"   # "gaussian" | "bilateral" | "morph"
    smooth_kernel: int = 3
    smooth_iterations: int = 1
    smooth_sigma: float = 0.0
    # Trail sharpening
    sharpen_trails: bool = False
    sharpen_amount: float = 1.0
    sharpen_kernel: int = 3


# =========================== Logging & timing ===========================

_LOG_KIND_MIN_LEVEL: Dict[str, int] = {
    "critical": 0,    # critical errors only
    "heading": 1,     # stage headers (Setup, Filtering, Stacking)
    "count": 2,       # counts and summaries
    "progress10": 3,  # periodic progress (every 10 during stacking)
    "perfile": 4,     # per-file verbose logging
}

def should_log(config: StarTrailBuilderConfig, kind: str) -> bool:
    return config.log_level >= _LOG_KIND_MIN_LEVEL.get(kind, 4)

def _timestamp_str() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def log(config: StarTrailBuilderConfig, kind: str, message: str):
    if should_log(config, kind):
        print(message)

class StageTimer:
    def __init__(self, config: StarTrailBuilderConfig, stage_name: str, kind_start: str = "heading", kind_end: str = "count"):
        self.config = config
        self.stage_name = stage_name
        self.kind_start = kind_start
        self.kind_end = kind_end
        self.start_time: Optional[float] = None

    def __enter__(self):
        self.start_time = time.perf_counter()
        log(self.config, self.kind_start, f"[STAGE] {self.stage_name} — start {_timestamp_str()}")
        return self

    def __exit__(self, exc_type, exc_value, traceback_obj):
        elapsed_time = time.perf_counter() - self.start_time
        if self.config.log_level >= 2:
            print(f"[STAGE] {self.stage_name} — end {_timestamp_str()}  (elapsed {elapsed_time:.2f}s)")
        elif self.config.log_level == 1:
            print(f"[STAGE] {self.stage_name} — end {_timestamp_str()}")
        return False  # never suppress exceptions


# =========================== Filename timestamp key ===========================

_FILENAME_TIMESTAMP_RE = re.compile(r"^image-(\d{14})\.jpg$", re.IGNORECASE)

def extract_timestamp_sort_key(file_path: str) -> Tuple[int, str]:
    """
    Returns (timestamp_int, basename) for sorting chronologically. If the filename cannot be
    parsed, returns (0, basename) so all unparseable names sort deterministically.
    """
    base_name = os.path.basename(file_path)
    match_obj = _FILENAME_TIMESTAMP_RE.match(base_name)
    if match_obj:
        try:
            return (int(match_obj.group(1)), base_name)
        except Exception:
            pass
    return (0, base_name)


# =========================== Color/mono detection ===========================

def is_color_file(file_path: str) -> Optional[bool]:
    """
    Inspect one image without forcing conversion:
      - True if image has 3 channels
      - False if single-channel
      - None if unreadable
    """
    image_any = cv2.imread(file_path, cv2.IMREAD_UNCHANGED)
    if image_any is None:
        return None
    if image_any.ndim == 3 and image_any.shape[2] >= 3:
        return True
    return False

def detect_color_mode(usable_files: List[str], sample_limit: int = 100) -> bool:
    """
    Returns True if ANY of the usable images are color (3+ channels).
    Samples up to 'sample_limit' files to decide quickly.
    """
    checked_count = 0
    for file_path in usable_files:
        checked_count += 1
        color_flag = is_color_file(file_path)
        if color_flag is True:
            return True
        if checked_count >= sample_limit:
            break
    return False


# =========================== Parallel Worker (process-based) ===========================

class ParallelStarTrailWorker:
    def __init__(self, usable_files: List[str], config: StarTrailBuilderConfig, use_color: bool):
        self.usable_files = usable_files
        self.config = config
        self.use_color = use_color
        self.num_workers = max(1, config.parallel)
        self.chunk_size = int(np.ceil(len(usable_files) / self.num_workers)) if self.num_workers > 0 else len(usable_files)
        self.file_chunks = [usable_files[i:i + self.chunk_size] for i in range(0, len(usable_files), self.chunk_size)]

    @staticmethod
    def mask_keep_bool(mask_path: str, shape_hw: Tuple[int, int]) -> np.ndarray:
        mask_image = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
        if mask_image is None:
            raise RuntimeError(f"Could not load mask file: {mask_path}")
        resized_mask = cv2.resize(mask_image, (shape_hw[1], shape_hw[0]), interpolation=cv2.INTER_NEAREST)
        return resized_mask >= 128

    @staticmethod
    def apply_per_frame_mask_float(image_float32: np.ndarray, keep_bool: np.ndarray) -> np.ndarray:
        if image_float32.ndim == 2:
            return image_float32 * keep_bool.astype(np.float32)
        mask_float = keep_bool.astype(np.float32)[..., None]
        return image_float32 * mask_float

    @staticmethod
    def _process_chunk(file_chunk: List[str],
                       comet_trails: bool,
                       comet_decay: float,
                       thread_index: int,
                       log_level: int,
                       mask_mode: str,
                       final_mask_path: Optional[str],
                       cloud_mask_path: Optional[str],
                       use_color: bool) -> Optional[np.ndarray]:
        """
        Process one chunk:
          - Load each frame in color or grayscale
          - Optionally apply per-frame final mask and cloud mask
          - Optionally apply comet decay
          - Max-composite into a chunk image
        Returns float32 composite or None if no frames were readable.
        """

        def local_should_log(kind: str) -> bool:
            return log_level >= _LOG_KIND_MIN_LEVEL[kind]

        if local_should_log("heading"):
            print(f"[THREAD-{thread_index}] Start: {len(file_chunk)} files @ {_timestamp_str()}")

        base_image_float = None
        keep_final_bool = None
        keep_cloud_bool = None
        read_flag = cv2.IMREAD_COLOR if use_color else cv2.IMREAD_GRAYSCALE

        for j, file_path in enumerate(file_chunk, 1):
            image_uint8 = cv2.imread(file_path, read_flag)
            if image_uint8 is None:
                if local_should_log("perfile"):
                    print(f"[THREAD-{thread_index}] SKIP unreadable {os.path.basename(file_path)}")
                continue

            if local_should_log("perfile"):
                gray_uint8 = cv2.cvtColor(image_uint8, cv2.COLOR_BGR2GRAY) if image_uint8.ndim == 3 else image_uint8
                brightness_value = float(gray_uint8.mean()) / 255.0  # normalized 0..1
                print(f"[THREAD-{thread_index}] {os.path.basename(file_path)} brightness={brightness_value:.3f}")
            elif local_should_log("progress10") and (j % 10 == 0):
                print(f"[THREAD-{thread_index}] Progress {j}/{len(file_chunk)}")

            image_float32 = image_uint8.astype(np.float32)

            # Apply masks per-frame if requested
            if mask_mode == "per-frame" and final_mask_path:
                if keep_final_bool is None:
                    keep_final_bool = ParallelStarTrailWorker.mask_keep_bool(final_mask_path, image_float32.shape[:2])
                image_float32 = ParallelStarTrailWorker.apply_per_frame_mask_float(image_float32, keep_final_bool)
            if cloud_mask_path:
                if keep_cloud_bool is None:
                    keep_cloud_bool = ParallelStarTrailWorker.mask_keep_bool(cloud_mask_path, image_float32.shape[:2])
                image_float32 = ParallelStarTrailWorker.apply_per_frame_mask_float(image_float32, keep_cloud_bool)

            if base_image_float is None:
                base_image_float = image_float32
            else:
                if comet_trails:
                    base_image_float *= comet_decay
                base_image_float = np.maximum(base_image_float, image_float32)

        return base_image_float

    def run(self) -> np.ndarray:
        if should_log(self.config, "heading"):
            print(f"[INFO] Parallel mode: {self.num_workers} workers, ~{self.chunk_size} files each")

        with Pool(self.num_workers) as multiprocessing_pool:
            chunk_results = multiprocessing_pool.starmap(
                ParallelStarTrailWorker._process_chunk,
                [(file_chunk,
                  self.config.comet_trails,
                  self.config.comet_decay,
                  thread_index + 1,
                  self.config.log_level,
                  self.config.mask_mode,
                  self.config.final_mask,
                  self.config.cloud_mask,
                  self.use_color)
                 for thread_index, file_chunk in enumerate(self.file_chunks)]
            )

        base_image_float = None
        for chunk_image_float in chunk_results:
            if chunk_image_float is None:
                continue
            base_image_float = chunk_image_float if base_image_float is None else np.maximum(base_image_float, chunk_image_float)

        if base_image_float is None:
            raise RuntimeError("Parallel workers produced no data")

        return np.clip(base_image_float, 0, 255).astype(np.uint8)


# =========================== Main Builder ===========================

class StarTrailBuilder:
    def __init__(self, config: StarTrailBuilderConfig):
        self.config = config
        self.label_color_bgr = self._parse_color_bgr(config.label_color)
        self.label_bg_bgr = self._parse_color_bgr(config.label_bg)
        self.use_color: bool = True  # finalized after filtering & detection

    # ----- Mask helpers -----
    @staticmethod
    def mask_keep_bool(mask_path: str, shape_hw: Tuple[int, int]) -> np.ndarray:
        mask_image = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
        if mask_image is None:
            raise RuntimeError(f"Could not load mask file: {mask_path}")
        resized_mask = cv2.resize(mask_image, (shape_hw[1], shape_hw[0]), interpolation=cv2.INTER_NEAREST)
        return resized_mask >= 128

    @staticmethod
    def apply_per_frame_mask_float(image_float32: np.ndarray, keep_bool: np.ndarray) -> np.ndarray:
        if image_float32.ndim == 2:
            return image_float32 * keep_bool.astype(np.float32)
        mask_float = keep_bool.astype(np.float32)[..., None]
        return image_float32 * mask_float

    # ----- Label helpers -----
    @staticmethod
    def _parse_color_bgr(color_text: str) -> Tuple[int, int, int]:
        color_text = color_text.strip()
        if color_text.startswith('#'):
            red_value = int(color_text[1:3], 16)
            green_value = int(color_text[3:5], 16)
            blue_value = int(color_text[5:7], 16)
            return (blue_value, green_value, red_value)
        blue_value, green_value, red_value = (int(part_text) for part_text in color_text.split(','))
        return (blue_value, green_value, red_value)

    @staticmethod
    def _bgr_to_gray_value(color_bgr: Tuple[int, int, int]) -> int:
        blue_value, green_value, red_value = color_bgr
        gray_value = 0.114 * blue_value + 0.587 * green_value + 0.299 * red_value
        return int(np.clip(gray_value, 0, 255))

    @staticmethod
    def _draw_label_cv2(image_uint8: np.ndarray, text: str,
                        color_bgr: Tuple[int, int, int], bg_bgr: Tuple[int, int, int],
                        scale: float, thickness: int, margin: int, pad: int) -> np.ndarray:
        if not text:
            return image_uint8
        font_face = cv2.FONT_HERSHEY_SIMPLEX

        if image_uint8.ndim == 2:
            color_value = StarTrailBuilder._bgr_to_gray_value(color_bgr)
            bg_value = StarTrailBuilder._bgr_to_gray_value(bg_bgr)
            (text_width, text_height), baseline = cv2.getTextSize(text, font_face, scale, thickness)
            text_x, text_y = margin, margin + text_height
            cv2.rectangle(image_uint8,
                          (text_x - pad, text_y - text_height - pad),
                          (text_x + text_width + pad, text_y + baseline + pad),
                          int(bg_value), -1)
            cv2.putText(image_uint8, text, (text_x, text_y), font_face, scale, int(color_value), thickness, cv2.LINE_AA)
            return image_uint8

        (text_width, text_height), baseline = cv2.getTextSize(text, font_face, scale, thickness)
        text_x, text_y = margin, margin + text_height
        cv2.rectangle(image_uint8,
                      (text_x - pad, text_y - text_height - pad),
                      (text_x + text_width + pad, text_y + baseline + pad),
                      bg_bgr, -1)
        cv2.putText(image_uint8, text, (text_x, text_y), font_face, scale, color_bgr, thickness, cv2.LINE_AA)
        return image_uint8

    # ----- Trail smoothing -----
    def smooth_trails_image(self, image_uint8: np.ndarray) -> np.ndarray:
        """
        Smooth jagged star-trail edges using the configured method.
        Applied before gamma/median and before final mask/label.
        """
        if not self.config.smooth_trails:
            return image_uint8

        method_name = self.config.smooth_method.lower()
        kernel_size = max(1, int(self.config.smooth_kernel))
        iteration_count = max(1, int(self.config.smooth_iterations))
        sigma_value = float(self.config.smooth_sigma)

        output_image = image_uint8
        if method_name == "gaussian":
            if kernel_size % 2 == 0:
                kernel_size += 1
            for _ in range(iteration_count):
                output_image = cv2.GaussianBlur(output_image, (kernel_size, kernel_size),
                                                sigmaX=(0 if sigma_value == 0 else sigma_value))
        elif method_name == "bilateral":
            diameter = max(3, kernel_size)
            for _ in range(iteration_count):
                output_image = cv2.bilateralFilter(output_image, d=diameter, sigmaColor=75, sigmaSpace=75)
        elif method_name == "morph":
            kernel_element = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
            for _ in range(iteration_count):
                output_image = cv2.morphologyEx(output_image, cv2.MORPH_OPEN, kernel_element)
                output_image = cv2.morphologyEx(output_image, cv2.MORPH_CLOSE, kernel_element)
        return output_image

    # ----- Trail sharpening -----
    def sharpen_trails_image(self, image_uint8: np.ndarray) -> np.ndarray:
        """
        Apply simple Laplacian sharpening to make trails pop.
        Runs after smoothing but before gamma/median postprocess.
        """
        if not self.config.sharpen_trails:
            return image_uint8

        kernel_size = max(1, int(self.config.sharpen_kernel))
        amount_value = float(self.config.sharpen_amount)

        laplacian_int16 = cv2.Laplacian(image_uint8, cv2.CV_16S, ksize=kernel_size)
        sharpened_uint8 = cv2.convertScaleAbs(image_uint8 - amount_value * laplacian_int16)
        return np.clip(sharpened_uint8, 0, 255).astype(np.uint8)

    # ----- Tone mapping / postprocess -----
    @staticmethod
    def apply_gamma(image_uint8: np.ndarray, gamma_value: float) -> np.ndarray:
        if gamma_value == 1.0:
            return image_uint8
        inverse_gamma = 1.0 / gamma_value
        lookup_table_float = np.array([(pixel_value / 255.0) ** inverse_gamma * 255 for pixel_value in np.arange(256)],
                                      dtype=np.float32)
        return cv2.LUT(image_uint8, np.clip(lookup_table_float, 0, 255).astype("uint8"))

    @staticmethod
    def apply_median_subtraction(image_uint8: np.ndarray, kernel_size: int = 51) -> np.ndarray:
        if kernel_size % 2 == 0:
            kernel_size += 1
        blurred_uint8 = cv2.medianBlur(image_uint8, kernel_size)
        return cv2.subtract(image_uint8, blurred_uint8)

    def postprocess_frame(self, frame_uint8: np.ndarray) -> np.ndarray:
        """
        Pipeline: (1) smoothing, (2) sharpening, (3) gamma/median, (4) final mask, (5) label.
        Works for grayscale (2D) and color (H x W x 3).
        """
        output_uint8 = frame_uint8
        output_uint8 = self.smooth_trails_image(output_uint8)
        output_uint8 = self.sharpen_trails_image(output_uint8)

        if self.config.postprocess == "gamma":
            output_uint8 = self.apply_gamma(output_uint8, self.config.gamma)
        elif self.config.postprocess == "median":
            output_uint8 = self.apply_median_subtraction(output_uint8)

        # Final-mask mode "final" applies mask once at the end
        if self.config.final_mask and self.config.mask_mode == "final":
            keep_bool = self.mask_keep_bool(self.config.final_mask, output_uint8.shape[:2])
            mask_uint8 = (keep_bool.astype(np.uint8)) * 255
            output_uint8 = cv2.bitwise_and(output_uint8, output_uint8, mask=mask_uint8)

        # Optional text label
        if self.config.label:
            output_uint8 = self._draw_label_cv2(
                output_uint8, self.config.label, self.label_color_bgr, self.label_bg_bgr,
                scale=self.config.label_scale, thickness=self.config.label_thickness,
                margin=self.config.label_margin, pad=self.config.label_pad
            )
        return output_uint8

    # ----- File discovery (sorted by timestamp) -----
    def discover_files(self) -> List[str]:
        candidate_files = glob.glob(os.path.join(self.config.input_dir, "*"))
        matched_files = [file_path for file_path in candidate_files if re.search(self.config.regex, os.path.basename(file_path))]
        matched_files.sort(key=extract_timestamp_sort_key)
        return matched_files

    # ----- Filtering (threaded brightness analysis) -----
    def analyze_file_brightness(self, file_path: str) -> Tuple[str, float, bool, str]:
        gray_uint8 = cv2.imread(file_path, cv2.IMREAD_GRAYSCALE)
        if gray_uint8 is None:
            return file_path, 0.0, False, "unreadable"
        brightness_value = float(gray_uint8.mean()) / 255.0  # normalized 0..1
        if self.config.max_brightness is not None and brightness_value > self.config.max_brightness:
            return file_path, brightness_value, False, "too bright"
        return file_path, brightness_value, True, "ok"

    def filter_usable(self, candidate_files: List[str]) -> List[str]:
        with StageTimer(self.config, "Filtering"):
            total_candidates = len(candidate_files)
            if self.config.log_level >= 2:
                print(f"[INFO] Candidates: {total_candidates}  (max_brightness in 0..1 = {self.config.max_brightness})")

            usable_files: List[str] = []
            processed_count = 0
            skipped_count = 0

            max_workers = os.cpu_count() * 2 if os.cpu_count() else 8
            with ThreadPoolExecutor(max_workers=max_workers) as thread_pool:
                futures_map = {thread_pool.submit(self.analyze_file_brightness, file_path): file_path for file_path in candidate_files}
                for completed_future in as_completed(futures_map):
                    file_path, brightness_value, is_ok, reason_text = completed_future.result()
                    processed_count += 1
                    base_name = os.path.basename(file_path)

                    if should_log(self.config, "perfile"):
                        if is_ok:
                            print(f"[USE ] {processed_count:5d}/{total_candidates} {base_name}  brightness={brightness_value:.3f}")
                        else:
                            print(f"[SKIP] {processed_count:5d}/{total_candidates} {base_name}  {reason_text} (b={brightness_value:.3f})")

                    if is_ok:
                        usable_files.append(file_path)
                    else:
                        skipped_count += 1

                    if self.config.log_level in (2, 3) and (processed_count % 10 == 0 or processed_count == total_candidates):
                        print(f"[INFO] Filter progress: processed={processed_count}/{total_candidates}  usable={len(usable_files)}  skipped={skipped_count}")

            usable_files.sort(key=extract_timestamp_sort_key)

            if self.config.test:
                if self.config.log_level >= 2:
                    print(f"[INFO] Applying test limit after sort: first {self.config.test} usable frames")
                usable_files = usable_files[: self.config.test]

            if self.config.log_level >= 2:
                print(f"[INFO] Usable files: {len(usable_files)}")
            return usable_files

    # ----- Sequential stacking -----
    def run_sequential(self, usable_files: List[str]):
        with StageTimer(self.config, "Stacking (sequential)"):
            if self.config.log_level >= 2:
                print(f"[INFO] Frames to stack (chronological): {len(usable_files)}")

            base_image_float = None
            video_writer = None
            fourcc_codec = cv2.VideoWriter_fourcc(*self.config.video_codec)

            keep_final_bool = None
            keep_cloud_bool = None

            read_flag = cv2.IMREAD_COLOR if self.use_color else cv2.IMREAD_GRAYSCALE

            first_image_uint8 = cv2.imread(usable_files[0], read_flag)
            if first_image_uint8 is None:
                raise RuntimeError(f"Failed to read first usable image: {usable_files[0]}")

            if self.config.final_mask and self.config.mask_mode == "per-frame":
                keep_final_bool = self.mask_keep_bool(self.config.final_mask, first_image_uint8.shape[:2])
            if self.config.cloud_mask:
                keep_cloud_bool = self.mask_keep_bool(self.config.cloud_mask, first_image_uint8.shape[:2])

            if self.config.save_intermediate:
                os.makedirs(self.config.intermediate_dir, exist_ok=True)

            total_frames = len(usable_files)

            def maybe_init_writer(sample_frame_uint8: np.ndarray):
                nonlocal video_writer
                if video_writer is None and self.config.video_path:
                    if sample_frame_uint8.ndim == 2:
                        height, width = sample_frame_uint8.shape
                    else:
                        height, width = sample_frame_uint8.shape[:2]
                    video_writer = cv2.VideoWriter(self.config.video_path, fourcc_codec, float(self.config.video_fps), (width, height))

            for i, file_path in enumerate(usable_files, 1):
                image_uint8 = cv2.imread(file_path, read_flag)
                if image_uint8 is None:
                    continue

                if should_log(self.config, "perfile") or (should_log(self.config, "progress10") and i % 10 == 0):
                    gray_uint8 = cv2.cvtColor(image_uint8, cv2.COLOR_BGR2GRAY) if image_uint8.ndim == 3 else image_uint8
                    brightness_value = float(gray_uint8.mean()) / 255.0
                if should_log(self.config, "perfile"):
                    print(f"[SEQ] {i}/{total_frames} {os.path.basename(file_path)} brightness={brightness_value:.3f}")
                elif should_log(self.config, "progress10") and (i % 10 == 0):
                    print(f"[SEQ] Progress {i}/{total_frames}")

                image_float32 = image_uint8.astype(np.float32)

                if keep_final_bool is not None:
                    image_float32 = self.apply_per_frame_mask_float(image_float32, keep_final_bool)
                if keep_cloud_bool is not None:
                    image_float32 = self.apply_per_frame_mask_float(image_float32, keep_cloud_bool)

                if base_image_float is None:
                    base_image_float = image_float32
                else:
                    if self.config.comet_trails:
                        base_image_float *= self.config.comet_decay
                    base_image_float = np.maximum(base_image_float, image_float32)

                # Periodic video frame (postprocessed to match final look)
                if self.config.video_path and (i % self.config.video_step == 0):
                    snapshot_uint8 = np.clip(base_image_float, 0, 255).astype(np.uint8)
                    visual_frame_uint8 = self.postprocess_frame(snapshot_uint8)
                    maybe_init_writer(visual_frame_uint8)
                    if visual_frame_uint8.ndim == 2:
                        video_writer.write(cv2.cvtColor(visual_frame_uint8, cv2.COLOR_GRAY2BGR))
                    else:
                        video_writer.write(visual_frame_uint8)

                # Optional intermediate save
                if self.config.save_intermediate and (i % self.config.save_intermediate == 0):
                    snapshot_uint8 = np.clip(base_image_float, 0, 255).astype(np.uint8)
                    visual_frame_uint8 = self.postprocess_frame(snapshot_uint8)
                    intermediate_path = os.path.join(self.config.intermediate_dir, f"intermediate_{i:04d}.jpg")
                    cv2.imwrite(intermediate_path, visual_frame_uint8)
                    if should_log(self.config, "progress10"):
                        print(f"[INFO] Saved intermediate {intermediate_path}")

            if base_image_float is None:
                raise RuntimeError("No images stacked")

            result_uint8 = np.clip(base_image_float, 0, 255).astype(np.uint8)
            final_visual_uint8 = self.postprocess_frame(result_uint8)
            cv2.imwrite(self.config.output, final_visual_uint8)
            if video_writer:
                video_writer.release()

    # ----- Public entrypoint -----
    def run(self):
        """
        Full pipeline:
          - Set niceness (if requested)
          - Configure OpenCV internal threads
          - Stage: Setup -> discover files
          - Stage: Filtering -> thread brightness filter
          - Detect color/mono from usable files
          - Stage: Stacking -> sequential or parallel compositing
          - Postprocess/mask/label -> write output
          - Print overall runtime
        """
        if self.config.nice is not None:
            try:
                os.nice(self.config.nice)
                if self.config.log_level >= 2:
                    print(f"[INFO] Process niceness set to {self.config.nice}")
            except PermissionError:
                if self.config.log_level >= 1:
                    print(f"[WARN] Unable to set niceness to {self.config.nice} (root required for negative values)")

        if self.config.parallel > 1:
            try:
                cv2.setNumThreads(1)
            except Exception:
                pass

        overall_start_time = time.perf_counter()

        with StageTimer(self.config, "Setup"):
            if self.config.log_level >= 2:
                print(f"[INFO] Input directory: {self.config.input_dir}")
                print(f"[INFO] Filename regex : {self.config.regex}")
                print(f"[INFO] Mode           : {'parallel' if self.config.parallel > 1 else 'sequential'}")

            discovered_files = self.discover_files()
            if self.config.log_level >= 2:
                print(f"[INFO] Found {len(discovered_files)} matching files (sorted by timestamp)")

        usable_files = self.filter_usable(discovered_files)
        if not usable_files:
            raise RuntimeError("No usable images found")

        self.use_color = detect_color_mode(usable_files)
        if self.config.log_level >= 2:
            print(f"[INFO] Working mode: {'color' if self.use_color else 'grayscale'}")

        if self.config.parallel > 1:
            with StageTimer(self.config, "Stacking (parallel)"):
                if self.config.log_level >= 2:
                    print(f"[INFO] Frames to stack (chronological): {len(usable_files)}")
                    print(f"[INFO] Spawning {max(1, self.config.parallel)} workers...")
                parallel_worker = ParallelStarTrailWorker(usable_files, self.config, use_color=self.use_color)
                stacked_uint8 = parallel_worker.run()
                final_visual_uint8 = self.postprocess_frame(stacked_uint8)
                cv2.imwrite(self.config.output, final_visual_uint8)
        else:
            self.run_sequential(usable_files)

        overall_elapsed = time.perf_counter() - overall_start_time
        if self.config.log_level >= 1:
            print(f"[OVERALL] Finished at {_timestamp_str()} — total elapsed {overall_elapsed:.2f}s")


# =========================== CLI entry ===========================

def main():
    import argparse
    argument_parser = argparse.ArgumentParser(
        description="Startrail stacker with timestamp-sorted processing, threaded filtering, masks (per-frame/final), cloud mask, comet trails, labels, video & intermediates, parallel mode, log levels, stage timing, niceness, auto color/mono, smoothing, sharpening, and brightness normalized to 0..1."
    )
    argument_parser.add_argument("input_dir")
    argument_parser.add_argument("-o", "--output", default="startrail.jpg")
    argument_parser.add_argument("--regex", default=r"^image-\d{14}\.jpg$",
                                 help="Regex to match filenames (default image-YYYYMMDDHHMMSS.jpg)")
    argument_parser.add_argument(
        "--max-brightness", type=float, default=None,
        help="Skip frames with mean brightness > value (0..1). Example: 0.25"
    )
    argument_parser.add_argument("--test", type=int, default=None, help="Limit to first N usable frames (after sorting)")
    argument_parser.add_argument("--comet-trails", action="store_true")
    argument_parser.add_argument("--comet-decay", type=float, default=0.98)
    argument_parser.add_argument("--final-mask", type=str, default=None)
    argument_parser.add_argument("--cloud-mask", type=str, default=None)
    argument_parser.add_argument("--mask-mode", choices=["final", "per-frame", "off"], default="final")
    argument_parser.add_argument("--postprocess", choices=["gamma", "median", "none"], default="gamma")
    argument_parser.add_argument("--gamma", type=float, default=0.6)
    argument_parser.add_argument("--video", dest="video_path", default=None)
    argument_parser.add_argument("--fps", dest="video_fps", type=int, default=30)
    argument_parser.add_argument("--video-step", type=int, default=10)
    argument_parser.add_argument("--codec", dest="video_codec", default="mp4v")
    argument_parser.add_argument("--save-intermediate", type=int, default=None)
    argument_parser.add_argument("--intermediate-dir", type=str, default="intermediates")
    argument_parser.add_argument("--label", type=str, default=None)
    argument_parser.add_argument("--label-color", type=str, default="#FFFFFF")
    argument_parser.add_argument("--label-bg", type=str, default="#000000")
    argument_parser.add_argument("--label-scale", type=float, default=0.7)
    argument_parser.add_argument("--label-thickness", type=int, default=2)
    argument_parser.add_argument("--label-margin", type=int, default=8)
    argument_parser.add_argument("--label-pad", type=int, default=4)
    argument_parser.add_argument("--label-utf8", action="store_true")
    argument_parser.add_argument("--label-font", type=str, default=None)
    argument_parser.add_argument("--label-font-size", type=int, default=20)
    argument_parser.add_argument("--parallel", type=int, default=1)
    argument_parser.add_argument("--log-level", type=int, choices=[0, 1, 2, 3, 4], default=2,
                                 help="0=critical only, 1=stages, 2=+counts (blocks of 10 during filtering), 3=+stack every 10, 4=per-file detail")
    argument_parser.add_argument("-v", "--verbose", action="store_true", help="Alias for --log-level 4")
    argument_parser.add_argument("--nice", type=int, default=None,
                                 help="Set process niceness (priority). 0=default, >0=lower priority, <0=higher (root only)")
    # Smoothing options
    argument_parser.add_argument("--smooth-trails", action="store_true",
                                 help="Enable trail smoothing to reduce jagged edges (applied before gamma/median).")
    argument_parser.add_argument("--smooth-method", choices=["gaussian", "bilateral", "morph"], default="gaussian",
                                 help="Smoothing method (default: gaussian).")
    argument_parser.add_argument("--smooth-kernel", type=int, default=3,
                                 help="Kernel size (pixels). For gaussian, odd values recommended (default: 3).")
    argument_parser.add_argument("--smooth-iterations", type=int, default=1,
                                 help="How many times to apply smoothing (default: 1).")
    argument_parser.add_argument("--smooth-sigma", type=float, default=0.0,
                                 help="Gaussian sigma (0 = auto). Ignored for non-gaussian methods.")
    # Sharpening options
    argument_parser.add_argument("--sharpen-trails", action="store_true",
                                 help="Enable sharpening filter on trails (applied after smoothing).")
    argument_parser.add_argument("--sharpen-amount", type=float, default=1.0,
                                 help="Sharpening strength multiplier (default: 1.0).")
    argument_parser.add_argument("--sharpen-kernel", type=int, default=3,
                                 help="Kernel size for Laplacian sharpening (default: 3).")

    parsed_args = argument_parser.parse_args()

    if parsed_args.verbose:
        parsed_args.log_level = 4
    if parsed_args.mask_mode == "off":
        parsed_args.final_mask = None

    if parsed_args.parallel > 1:
        try:
            cv2.setNumThreads(1)
        except Exception:
            pass

    if parsed_args.nice is not None:
        try:
            os.nice(parsed_args.nice)
            if parsed_args.log_level >= 2:
                print(f"[INFO] Process niceness set to {parsed_args.nice}")
        except PermissionError:
            if parsed_args.log_level >= 1:
                print(f"[WARN] Unable to set niceness to {parsed_args.nice} (root required for negative values)")

    config = StarTrailBuilderConfig(**vars(parsed_args))
    StarTrailBuilder(config).run()


if __name__ == "__main__":
    main()