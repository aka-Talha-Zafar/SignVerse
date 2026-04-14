#!/usr/bin/env python3
"""
Copy one random training image per letter from the Kaggle ASL Alphabet layout into
`static/alphabet_refs/` so Hugging Face Space can serve them without the full dataset tree.

Usage (from repo root or huggingface-space/):
  python scripts/prepare_alphabet_refs.py --src "C:/path/to/asl_alphabet_train"

The Kaggle train folder contains subfolders A, B, ... Z with many JPEGs each.
"""
from __future__ import annotations

import argparse
import random
import shutil
from pathlib import Path


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--src",
        required=True,
        type=Path,
        help="Path to asl_alphabet_train (contains A/, B/, ...)",
    )
    p.add_argument(
        "--dest",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "static" / "alphabet_refs",
        help="Output directory (default: huggingface-space/static/alphabet_refs)",
    )
    args = p.parse_args()
    src: Path = args.src
    dest: Path = args.dest
    if not src.is_dir():
        raise SystemExit(f"Source not found or not a directory: {src}")

    dest.mkdir(parents=True, exist_ok=True)
    letters = [chr(c) for c in range(ord("A"), ord("Z") + 1)]
    copied = 0
    for letter in letters:
        folder = src / letter
        if not folder.is_dir():
            print(f"skip {letter}: no folder {folder}")
            continue
        imgs = [
            f
            for f in folder.iterdir()
            if f.is_file() and f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")
        ]
        if not imgs:
            print(f"skip {letter}: no images in {folder}")
            continue
        pick = random.choice(imgs)
        out = dest / f"{letter}{pick.suffix.lower()}"
        shutil.copy2(pick, out)
        copied += 1
        print(f"{letter} <- {pick.name}")
    print(f"Done. Copied {copied} letters into {dest}")


if __name__ == "__main__":
    main()
