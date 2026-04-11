"""
SignVerse Learning Module API
=============================
Separate FastAPI server for the Learning Module.
Does NOT touch app.py — runs independently on port 7861.

Endpoints:
  GET  /api/learning/alphabet/image/{letter}  — Serve ASL alphabet training image
  GET  /api/learning/health                   — Health check
"""

import os
import random
import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s")
log = logging.getLogger("signverse-learning")

app = FastAPI(title="SignVerse Learning API", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

# Path to the ASL Alphabet dataset (Kaggle: grassknoted/asl-alphabet)
# Expected structure: DATASET_DIR/asl_alphabet_train/{A,B,...,Z}/*.jpg
DATASET_DIR = os.environ.get(
    "ASL_ALPHABET_DATASET_DIR",
    os.path.join(os.path.dirname(__file__), "datasets", "asl_alphabet_train")
)

_image_cache: dict[str, list[str]] = {}


def _load_letter_images(letter: str) -> list[str]:
    """Discover all image paths for a given letter from the dataset."""
    if letter in _image_cache:
        return _image_cache[letter]

    letter_dir = os.path.join(DATASET_DIR, letter.upper())
    if not os.path.isdir(letter_dir):
        _image_cache[letter] = []
        return []

    images = []
    for fname in os.listdir(letter_dir):
        if fname.lower().endswith((".jpg", ".jpeg", ".png")):
            images.append(os.path.join(letter_dir, fname))

    _image_cache[letter] = images
    return images


@app.get("/")
def root():
    return {"message": "SignVerse Learning API v1.0", "docs": "/docs"}


@app.get("/api/learning/health")
def health():
    has_dataset = os.path.isdir(DATASET_DIR)
    sample_letter = "A"
    sample_images = _load_letter_images(sample_letter)
    return {
        "status": "ok",
        "version": "1.0",
        "dataset_found": has_dataset,
        "dataset_path": DATASET_DIR,
        "sample_letter_count": len(sample_images),
    }


@app.get("/api/learning/alphabet/image/{letter}")
def alphabet_image(letter: str):
    """Return a random training image for the given letter."""
    letter = letter.upper().strip()
    if len(letter) != 1 or not letter.isalpha():
        raise HTTPException(status_code=400, detail="Invalid letter. Must be A-Z.")

    images = _load_letter_images(letter)
    if not images:
        raise HTTPException(
            status_code=404,
            detail=f"No images found for letter '{letter}'. "
                   f"Set ASL_ALPHABET_DATASET_DIR to point to the ASL alphabet dataset. "
                   f"Looked in: {os.path.join(DATASET_DIR, letter)}"
        )

    chosen = random.choice(images)
    return FileResponse(
        chosen,
        media_type="image/jpeg",
        headers={"Cache-Control": "no-cache"},
    )


@app.get("/api/learning/alphabet/images/{letter}")
def alphabet_images(letter: str, count: int = 4):
    """Return multiple random image paths for quiz options."""
    letter = letter.upper().strip()
    if len(letter) != 1 or not letter.isalpha():
        raise HTTPException(status_code=400, detail="Invalid letter")

    images = _load_letter_images(letter)
    if not images:
        raise HTTPException(status_code=404, detail=f"No images for '{letter}'")

    selected = random.sample(images, min(count, len(images)))
    return {"letter": letter, "count": len(selected), "images": selected}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("LEARNING_API_PORT", "7861"))
    log.info(f"Starting Learning API on port {port}")
    log.info(f"Dataset directory: {DATASET_DIR}")
    uvicorn.run(app, host="0.0.0.0", port=port)
