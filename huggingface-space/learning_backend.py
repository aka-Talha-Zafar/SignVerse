"""
SignVerse Learning Backend
==========================
All learning-only HTTP routes and alphabet model loading live here — separate from Sign-to-Text logic in app.py.

Modes:
  1) Standalone Space / local:  python learning_backend.py   (uvicorn serves `app`)
  2) Same process as app.py:    SignVerse repo wires this at the bottom of `app.py` via
     `integrate_learning_into_signverse(app)` (after setting SIGNVERSE_LEARNING_INTEGRATED=1).

     That removes the legacy POST /api/learning/predict route from `app` and mounts this module's
     routes on the same FastAPI instance (one Hugging Face Space, one URL).

     When app.py sets SIGNVERSE_LEARNING_INTEGRATED=1 before calling this, `load_models()` in app.py
     skips loading the alphabet weights so they exist only in this module (one copy in RAM).

Env: MODEL_DIR, HF_TOKEN, HF_MODELS_REPO, ASL_ALPHABET_DATASET_DIR, ALPHABET_NUM_CLASSES,
     ALPHABET_INPUT_SIZE, ALPHABET_IMAGENET_NORM, LEARNING_API_PORT
"""

from __future__ import annotations

import base64
import logging
import os
import random
from typing import Optional

import cv2
import numpy as np
import torch
import torch.nn as nn
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
log = logging.getLogger("signverse-learning-backend")

learning_router = APIRouter(tags=["learning"])

MODEL_DIR = os.environ.get("MODEL_DIR", "./models")
DEVICE = torch.device("cpu")

alphabet_cls: Optional[nn.Module] = None
class_mapping: Optional[dict] = None

DATASET_DIR = os.environ.get(
    "ASL_ALPHABET_DATASET_DIR",
    os.path.join(os.path.dirname(__file__), "datasets", "asl_alphabet_train"),
)
_image_cache: dict[str, list[str]] = {}


class LearningPredictRequest(BaseModel):
    frame: str


def _alphabet_torch_load(path: str):
    try:
        return torch.load(path, map_location=DEVICE, weights_only=False)
    except TypeError:
        return torch.load(path, map_location=DEVICE)


def _infer_alphabet_num_classes(cm: Optional[dict]) -> int:
    env_n = os.environ.get("ALPHABET_NUM_CLASSES")
    if env_n and str(env_n).isdigit():
        return max(1, int(env_n))
    if not cm:
        return 29
    mx = -1
    for k in cm:
        try:
            mx = max(mx, int(k))
        except (TypeError, ValueError):
            continue
    if mx >= 0:
        return mx + 1
    if isinstance(cm, dict):
        return max(1, len(cm))
    return 29


def _strip_dataparallel_state_dict(sd: dict) -> dict:
    if not isinstance(sd, dict):
        return sd
    if not any(isinstance(k, str) and k.startswith("module.") for k in sd):
        return sd
    return {k.replace("module.", "", 1): v for k, v in sd.items() if isinstance(v, torch.Tensor)}


def _try_load_alphabet_from_state_dict(sd: dict, n_classes: int) -> Optional[nn.Module]:
    if not isinstance(sd, dict) or not sd:
        return None
    sd0 = _strip_dataparallel_state_dict(sd)

    def _match_score(m: nn.Module) -> int:
        model_sd = m.state_dict()
        return sum(1 for k in sd0 if k in model_sd and sd0[k].shape == model_sd[k].shape)

    def _try_mobilenet_v2():
        import torchvision.models as tvm

        m = tvm.mobilenet_v2(weights=None)
        in_f = m.classifier[1].in_features
        m.classifier[1] = nn.Linear(in_f, n_classes)
        try:
            missing, unexpected = m.load_state_dict(sd0, strict=False)
        except Exception as ex:
            log.debug("mobilenet_v2 load_state_dict: %s", ex)
            return None
        matched = _match_score(m)
        if matched < 20:
            return None
        log.info(
            "Alphabet: mobilenet_v2 (n_classes=%s, missing=%s, unexpected=%s)",
            n_classes,
            len(missing),
            len(unexpected),
        )
        return m

    def _try_resnet(builder_fn, name: str):
        import torchvision.models as tvm

        m = builder_fn(weights=None)
        in_f = m.fc.in_features
        m.fc = nn.Linear(in_f, n_classes)
        try:
            missing, unexpected = m.load_state_dict(sd0, strict=False)
        except Exception as ex:
            log.debug("%s load_state_dict: %s", name, ex)
            return None
        matched = _match_score(m)
        if matched < 15:
            return None
        log.info(
            "Alphabet: %s (n_classes=%s, missing=%s, unexpected=%s)",
            name,
            n_classes,
            len(missing),
            len(unexpected),
        )
        return m

    try:
        import torchvision.models as tvm

        mod = _try_mobilenet_v2()
        if mod is not None:
            return mod
        for builder, tag in (
            (tvm.resnet18, "resnet18"),
            (tvm.resnet34, "resnet34"),
            (tvm.resnet50, "resnet50"),
        ):
            mod = _try_resnet(builder, tag)
            if mod is not None:
                return mod
    except Exception as e:
        log.warning("torchvision alphabet fallback failed: %s", e)
    return None


def _unwrap_alphabet_checkpoint(loaded, n_classes: int) -> Optional[nn.Module]:
    if loaded is None:
        return None
    if isinstance(loaded, torch.jit.ScriptModule):
        return loaded
    if isinstance(loaded, nn.Module):
        return loaded
    if not isinstance(loaded, dict):
        return None

    for key in ("model", "classifier", "net", "student", "student_model"):
        m = loaded.get(key)
        if isinstance(m, nn.Module):
            return m

    sd = None
    if isinstance(loaded.get("state_dict"), dict):
        sd = loaded["state_dict"]
    elif isinstance(loaded.get("model_state_dict"), dict):
        sd = loaded["model_state_dict"]
    elif all(isinstance(v, torch.Tensor) for v in loaded.values()):
        sd = loaded

    if sd is not None:
        return _try_load_alphabet_from_state_dict(sd, n_classes)
    return None


def _alphabet_forward_logits(model: nn.Module, x: torch.Tensor) -> torch.Tensor:
    x = x.to(DEVICE)
    model.eval()
    with torch.no_grad():
        out = model(x)
    if isinstance(out, (tuple, list)):
        out = out[0]
    if not isinstance(out, torch.Tensor):
        raise TypeError(f"Classifier returned {type(out).__name__}, expected Tensor")
    if out.dim() == 1:
        out = out.unsqueeze(0)
    return out


def _load_letter_images(letter: str) -> list[str]:
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


def load_alphabet_models():
    global alphabet_cls, class_mapping

    os.makedirs(MODEL_DIR, exist_ok=True)

    try:
        from huggingface_hub import hf_hub_download

        HF_TOKEN = os.environ.get("HF_TOKEN")
        HF_REPO = os.environ.get("HF_MODELS_REPO", "TalhaZafar7406/signverse-models")
        for fn in ("signverse_asl_classifier.pt", "class_mapping.json"):
            dest = os.path.join(MODEL_DIR, fn)
            if not os.path.exists(dest):
                log.info("Downloading %s ...", fn)
                hf_hub_download(
                    repo_id=HF_REPO,
                    filename=fn,
                    local_dir=MODEL_DIR,
                    token=HF_TOKEN,
                    repo_type="model",
                )
    except Exception as e:
        log.warning("HF hub download: %s", e)

    class_mapping = None
    cm_path = os.path.join(MODEL_DIR, "class_mapping.json")
    if os.path.exists(cm_path):
        import json

        with open(cm_path, encoding="utf-8") as f:
            class_mapping = json.load(f)

    alphabet_cls = None
    cls_path = os.path.join(MODEL_DIR, "signverse_asl_classifier.pt")
    if os.path.exists(cls_path):
        try:
            raw = _alphabet_torch_load(cls_path)
            n_cls = _infer_alphabet_num_classes(class_mapping)
            mod = _unwrap_alphabet_checkpoint(raw, n_cls)
            if mod is not None:
                alphabet_cls = mod.to(DEVICE).eval()
                log.info("Alphabet classifier loaded for learning backend")
            else:
                log.error(
                    "Could not build a runnable module from signverse_asl_classifier.pt. "
                    "Use a full nn.Module pickle, dict with key 'model', or ResNet/MobileNetV2 state_dict."
                )
        except Exception as e:
            log.error("Alphabet load failed: %s", e, exc_info=True)
            alphabet_cls = None
    else:
        log.warning("signverse_asl_classifier.pt not found under %s", MODEL_DIR)


# ── Routes (mounted on standalone `app` or on main SignVerse `app` via integrate) ──


@learning_router.get("/api/learning/health")
def learning_health():
    sample = _load_letter_images("A")
    return {
        "status": "ok",
        "version": "1.2",
        "alphabet_classifier_loaded": alphabet_cls is not None,
        "class_mapping_loaded": class_mapping is not None,
        "dataset_found": os.path.isdir(DATASET_DIR),
        "dataset_path": DATASET_DIR,
        "sample_letter_a_images": len(sample),
        "model_dir": MODEL_DIR,
    }


@learning_router.post("/api/learning/predict")
def learning_predict(req: LearningPredictRequest):
    if alphabet_cls is None:
        letters = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
        letter = random.choice(letters)
        return {
            "letter": letter,
            "confidence": round(random.uniform(0.55, 0.92), 2),
            "top3": [{l: round(random.uniform(0.1, 0.9), 2)} for l in random.sample(letters, 3)],
            "warning": "Alphabet classifier not loaded — returning random placeholder",
        }
    try:
        img_data = base64.b64decode(req.frame.split(",")[-1])
        arr = np.frombuffer(img_data, dtype=np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid frame")

        try:
            side = int(os.environ.get("ALPHABET_INPUT_SIZE", "224"))
        except ValueError:
            side = 224
        side = max(64, min(side, 640))
        resized = cv2.resize(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB), (side, side))
        tensor = torch.tensor(resized, dtype=torch.float32).permute(2, 0, 1).unsqueeze(0) / 255.0

        if os.environ.get("ALPHABET_IMAGENET_NORM", "").lower() in ("1", "true", "yes"):
            mean = torch.tensor([0.485, 0.456, 0.406], device=DEVICE).view(1, 3, 1, 1)
            std = torch.tensor([0.229, 0.224, 0.225], device=DEVICE).view(1, 3, 1, 1)
            tensor = tensor.to(DEVICE)
            tensor = (tensor - mean) / std

        logits = _alphabet_forward_logits(alphabet_cls, tensor)
        probs = torch.softmax(logits, dim=-1)[0]
        k = min(3, int(probs.numel()))
        top3v, top3i = probs.topk(k)
        letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ del space".split()

        def il(i: int) -> str:
            if class_mapping:
                lab = class_mapping.get(str(int(i)))
                if lab is not None:
                    return str(lab)
            ii = int(i)
            return letters[ii] if ii < len(letters) else str(ii)

        return {
            "letter": il(int(top3i[0])),
            "confidence": round(float(top3v[0]), 3),
            "top3": [{il(int(i)): round(float(v), 3)} for i, v in zip(top3i, top3v)],
        }
    except HTTPException:
        raise
    except Exception as e:
        log.error("learning_predict: %s", e, exc_info=True)
        msg = str(e).replace("\n", " ")[:240]
        raise HTTPException(status_code=503, detail=f"Alphabet inference failed: {msg}")


@learning_router.get("/api/learning/alphabet/image/{letter}")
def alphabet_image(letter: str):
    letter = letter.upper().strip()
    if len(letter) != 1 or not letter.isalpha():
        raise HTTPException(status_code=400, detail="Invalid letter. Must be A-Z.")
    images = _load_letter_images(letter)
    if not images:
        raise HTTPException(
            status_code=404,
            detail=f"No images for '{letter}'. Set ASL_ALPHABET_DATASET_DIR to the Kaggle asl_alphabet_train folder.",
        )
    chosen = random.choice(images)
    return FileResponse(chosen, media_type="image/jpeg", headers={"Cache-Control": "no-cache"})


def _remove_route_by_path_and_method(main_app: FastAPI, path: str, method: str) -> int:
    """Drop first matching route so a new handler can replace it without editing earlier source lines."""
    method_u = method.upper()
    kept: list = []
    removed = 0
    for route in main_app.router.routes:
        p = getattr(route, "path", None)
        methods = getattr(route, "methods", None) or frozenset()
        if p == path and method_u in {m.upper() for m in methods}:
            removed += 1
            continue
        kept.append(route)
    main_app.router.routes = kept
    return removed


def integrate_learning_into_signverse(main_app: FastAPI) -> None:
    """
    Attach this module's learning routes to the main SignVerse FastAPI `app`.

    Removes the existing POST /api/learning/predict route from `main_app` (typically defined in app.py)
    so there is no duplicate path, then includes `learning_router`.

    Call exactly once at the bottom of app.py:
        from learning_backend import integrate_learning_into_signverse
        integrate_learning_into_signverse(app)
    """
    dropped = _remove_route_by_path_and_method(main_app, "/api/learning/predict", "POST")
    log.info(
        "integrate_learning_into_signverse: removed %s prior route(s) for POST /api/learning/predict",
        dropped,
    )
    main_app.include_router(learning_router)

    @main_app.on_event("startup")
    async def _learning_startup():
        load_alphabet_models()
        log.info(
            "Learning (integrated) ready | alphabet=%s | dataset_dir_exists=%s",
            alphabet_cls is not None,
            os.path.isdir(DATASET_DIR),
        )


def create_standalone_learning_app() -> FastAPI:
    """Used for `learning_backend:app` when this file is the Space entrypoint."""
    a = FastAPI(title="SignVerse Learning Backend", version="1.2")
    a.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    a.include_router(learning_router)

    @a.on_event("startup")
    async def _standalone_startup():
        load_alphabet_models()
        log.info(
            "Learning backend (standalone) | alphabet=%s | dataset_dir_exists=%s",
            alphabet_cls is not None,
            os.path.isdir(DATASET_DIR),
        )

    @a.get("/")
    def _root():
        return {"service": "SignVerse Learning Backend", "docs": "/docs"}

    return a


app = create_standalone_learning_app()


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("LEARNING_API_PORT", "7861"))
    uvicorn.run(app, host="0.0.0.0", port=port)
