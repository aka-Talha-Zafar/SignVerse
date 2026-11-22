"""
Generate a 250-word keyframe avatar database from Google ASL Parquet landmarks.

Usage:
  python scripts/generate_google_avatar_database.py ^
    --input_dir ../asl_sample_250 ^
    --output ../huggingface-space/google_asl_database.json
"""

from __future__ import annotations

import argparse
import csv
import json
import math
from pathlib import Path

import numpy as np
import pandas as pd


POSE_COUNT = 33
HAND_COUNT = 21
FRAME_COUNT = 40
POINT_COUNT = POSE_COUNT + HAND_COUNT + HAND_COUNT
TARGET_SHOULDER_WIDTH = 0.30


def is_missing(x: float, y: float) -> bool:
    return (
        not math.isfinite(float(x))
        or not math.isfinite(float(y))
        or (abs(float(x)) < 1e-7 and abs(float(y)) < 1e-7)
    )


def resample_frames(frames: np.ndarray, target_count: int) -> np.ndarray:
    if len(frames) == target_count:
        return frames.copy()
    if len(frames) == 1:
        return np.repeat(frames, target_count, axis=0)

    positions = np.linspace(0, len(frames) - 1, target_count)
    low = np.floor(positions).astype(np.int32)
    high = np.minimum(low + 1, len(frames) - 1)
    fraction = (positions - low).reshape(-1, 1, 1)
    return frames[low] * (1.0 - fraction) + frames[high] * fraction


def fill_short_gaps(frames: np.ndarray) -> np.ndarray:
    """Fill isolated missing points between real detections; do not fill long gaps."""
    filled = frames.copy()
    for point_index in range(POINT_COUNT):
        xs = filled[:, point_index, 0]
        ys = filled[:, point_index, 1]
        for axis_values in (xs, ys):
            run_start = None
            for index in range(len(axis_values)):
                missing = abs(axis_values[index]) < 1e-7
                if missing and run_start is None:
                    run_start = index
                elif not missing and run_start is not None:
                    gap = index - run_start
                    if gap <= 4 and run_start > 0:
                        before = axis_values[run_start - 1]
                        after = axis_values[index]
                        axis_values[run_start:index] = np.linspace(before, after, gap + 2)[1:-1]
                    run_start = None
    return filled


def smooth_frames(frames: np.ndarray) -> np.ndarray:
    if len(frames) < 3:
        return frames
    smoothed = frames.copy()
    for point_index in range(POINT_COUNT):
        for axis in range(2):
            values = frames[:, point_index, axis]
            smoothed[:, point_index, axis] = (
                np.r_[values[0], values[:-1]] * 0.2
                + values * 0.6
                + np.r_[values[1:], values[-1]] * 0.2
            )
    return smoothed


def parquet_to_frames(path: Path) -> np.ndarray:
    data = pd.read_parquet(
        path,
        columns=["frame", "type", "landmark_index", "x", "y", "z"],
    )
    data = data[data["type"].isin(["pose", "right_hand", "left_hand"])].copy()
    data[["x", "y", "z"]] = data[["x", "y", "z"]].fillna(0.0).astype(np.float32)

    frame_ids = sorted(int(value) for value in data["frame"].unique())
    frame_map = {frame_id: index for index, frame_id in enumerate(frame_ids)}
    frames = np.zeros((len(frame_ids), POINT_COUNT, 2), dtype=np.float32)

    offsets = {"pose": 0, "right_hand": 33, "left_hand": 54}
    limits = {"pose": 33, "right_hand": 21, "left_hand": 21}

    for row in data.itertuples(index=False):
        landmark_type = str(row.type)
        landmark_index = int(row.landmark_index)
        if landmark_index >= limits[landmark_type]:
            continue
        frame_index = frame_map[int(row.frame)]
        output_index = offsets[landmark_type] + landmark_index
        x = float(row.x)
        y = float(row.y)
        frames[frame_index, output_index, 0] = x if math.isfinite(x) else 0.0
        frames[frame_index, output_index, 1] = y if math.isfinite(y) else 0.0

    # Shoulder-relative normalization. 0,0 is the avatar center in the renderer.
    for frame in frames:
        left_shoulder = frame[11].copy()
        right_shoulder = frame[12].copy()
        left_valid = not is_missing(left_shoulder[0], left_shoulder[1])
        right_valid = not is_missing(right_shoulder[0], right_shoulder[1])

        if left_valid and right_valid:
            origin = (left_shoulder + right_shoulder) * 0.5
            scale = float(np.linalg.norm(right_shoulder - left_shoulder))
        else:
            origin = np.array([0.5, 0.5], dtype=np.float32)
            scale = 0.0

        if not math.isfinite(scale) or scale < 1e-3:
            scale = 1.0

        for point_index in range(POINT_COUNT):
            x, y = frame[point_index]
            if is_missing(x, y):
                frame[point_index] = 0.0
            else:
                frame[point_index] = (
                    (frame[point_index] - origin) / scale
                    * TARGET_SHOULDER_WIDTH
                )

    frames = resample_frames(frames, FRAME_COUNT)
    frames = fill_short_gaps(frames)
    return smooth_frames(frames)


def frame_quality(frames: np.ndarray) -> dict:
    pose_count = 0
    right_count = 0
    left_count = 0

    for frame in frames:
        pose_count += sum(
            not is_missing(float(point[0]), float(point[1]))
            for point in frame[:POSE_COUNT]
        )
        right_count += sum(
            not is_missing(float(point[0]), float(point[1]))
            for point in frame[33:54]
        )
        left_count += sum(
            not is_missing(float(point[0]), float(point[1]))
            for point in frame[54:75]
        )

    total = max(1, len(frames))
    return {
        "pose": pose_count / (total * POSE_COUNT),
        "right_hand": right_count / (total * HAND_COUNT),
        "left_hand": left_count / (total * HAND_COUNT),
    }


def candidate_score(frames: np.ndarray, quality: dict) -> float:
    return (
        quality["pose"] * 2.0
        + quality["right_hand"] * 1.5
        + quality["left_hand"] * 1.5
    )


def load_csv(input_dir: Path) -> list[dict]:
    csv_path = input_dir / "train.csv"
    with csv_path.open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input_dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--manifest", type=Path)
    args = parser.parse_args()

    input_dir = args.input_dir.resolve()
    rows = load_csv(input_dir)
    grouped: dict[str, list[dict]] = {}
    for row in rows:
        grouped.setdefault(row["sign"], []).append(row)

    label_map_path = input_dir / "sign_to_prediction_index_map.json"
    label_map = json.loads(label_map_path.read_text(encoding="utf-8"))
    csv_signs = set(grouped)
    map_signs = set(label_map)
    if csv_signs != map_signs:
        raise RuntimeError(
            f"Label mismatch: CSV-only={sorted(csv_signs-map_signs)}, "
            f"map-only={sorted(map_signs-csv_signs)}"
        )

    database: dict[str, list[list[list[float]]]] = {}
    manifest: dict[str, dict] = {}

    for sign in sorted(grouped):
        selected = None
        selected_quality = None
        selected_score = -1.0
        selected_row = None

        for row in grouped[sign]:
            path = input_dir / row["path"]
            if not path.is_file():
                raise FileNotFoundError(path)
            frames = parquet_to_frames(path)
            quality = frame_quality(frames)
            score = candidate_score(frames, quality)
            if score > selected_score:
                selected = frames
                selected_quality = quality
                selected_score = score
                selected_row = row

        if selected is None:
            continue

        database[sign] = [
            [[round(float(x), 5), round(float(y), 5)] for x, y in frame]
            for frame in selected
        ]
        manifest[sign] = {
            "participant_id": int(selected_row["participant_id"]),
            "sequence_id": int(selected_row["sequence_id"]),
            "frame_count": FRAME_COUNT,
            "quality": {key: round(value, 4) for key, value in selected_quality.items()},
            "selection_score": round(selected_score, 4),
        }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(database, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    manifest_path = args.manifest or args.output.with_name(
        args.output.stem + "_manifest.json"
    )
    manifest_path.write_text(
        json.dumps(
            {
                "source": str(input_dir),
                "point_layout": (
                    "0-32 pose, 33-53 right_hand, 54-74 left_hand"
                ),
                "frame_count": FRAME_COUNT,
                "sign_count": len(database),
                "selections": manifest,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"Generated {len(database)} signs in {args.output}")
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    main()
