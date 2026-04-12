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
     ALPHABET_INPUT_SIZE, ALPHABET_NORM_TYPE (imagenet|half|none  default=imagenet),
     LEARNING_API_PORT
"""

from __future__ import annotations

import base64
import logging
import math
import os
import random
import re
from collections import OrderedDict
from typing import Optional

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

try:
    import mediapipe as mp

    _mp_hands = mp.solutions.hands
    _mp_hands_detector: Optional[object] = None  # lazy-init in predict
    _MP_HANDS_AVAILABLE = True
except Exception:
    _mp_hands = None  # type: ignore[assignment]
    _mp_hands_detector = None
    _MP_HANDS_AVAILABLE = False

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
log = logging.getLogger("signverse-learning-backend")

learning_router = APIRouter(tags=["learning"])

MODEL_DIR = os.environ.get("MODEL_DIR", "./models")
DEVICE = torch.device("cpu")

def _get_hand_crop(rgb_frame: np.ndarray, pad_frac: float = 0.25) -> Optional[np.ndarray]:
    """
    Detect the largest hand in *rgb_frame* via MediaPipe Hands and return a square
    crop of it (with *pad_frac* padding on each side).  Returns None if no hand is
    found or if MediaPipe is unavailable, in which case the caller falls back to the
    full frame.
    """
    global _mp_hands_detector
    if not _MP_HANDS_AVAILABLE or _mp_hands is None:
        return None
    if _mp_hands_detector is None:
        try:
            _mp_hands_detector = _mp_hands.Hands(
                static_image_mode=True,
                max_num_hands=1,
                min_detection_confidence=0.4,
            )
        except Exception:
            return None
    try:
        result = _mp_hands_detector.process(rgb_frame)
        if not result.multi_hand_landmarks:
            return None
        h, w = rgb_frame.shape[:2]
        lm = result.multi_hand_landmarks[0].landmark
        xs = [l.x for l in lm]
        ys = [l.y for l in lm]
        x_min = max(0.0, min(xs) - pad_frac * (max(xs) - min(xs)))
        x_max = min(1.0, max(xs) + pad_frac * (max(xs) - min(xs)))
        y_min = max(0.0, min(ys) - pad_frac * (max(ys) - min(ys)))
        y_max = min(1.0, max(ys) + pad_frac * (max(ys) - min(ys)))
        # Make it square (helps the model whose training images were square)
        x_span = x_max - x_min
        y_span = y_max - y_min
        half = max(x_span, y_span) / 2
        cx, cy = (x_min + x_max) / 2, (y_min + y_max) / 2
        x1 = max(0, int((cx - half) * w))
        x2 = min(w, int((cx + half) * w))
        y1 = max(0, int((cy - half) * h))
        y2 = min(h, int((cy + half) * h))
        if x2 - x1 < 20 or y2 - y1 < 20:
            return None
        return rgb_frame[y1:y2, x1:x2]
    except Exception:
        return None


def _alphabet_norm_type() -> str:
    """
    Optional per-channel normalisation applied AFTER the tensor is built.

    The SignVerse ASL training notebook loaded images as raw uint8 arrays and
    did NOT divide by 255, so the model's BN running_mean/var are calibrated for
    the [0, 255] pixel range.  Inference therefore also keeps values in [0, 255]
    (see learning_predict — there is intentionally NO /255 division there).

    This env var controls whether an additional channel-wise shift/scale is
    applied on top of the [0, 255] base.  Options (set ALPHABET_NORM_TYPE):

      none (default) – no extra normalisation; pass raw [0, 255] to the model
      imagenet255    – subtract ImageNet means in [0,255] space and divide by
                       std in [0,255]:  mean=[123.675, 116.28, 103.53]
                                        std =[  58.40,  57.12,  57.375]
      half           – (legacy) map [0,1] to [-1,1]; only for models whose
                       BN stats were calibrated for that range

    Leave this at "none" unless you know your training code used a specific
    normalisation on top of [0, 255] pixel values.
    """
    return os.environ.get("ALPHABET_NORM_TYPE", "none").strip().lower()


def _alphabet_use_imagenet_norm() -> bool:
    return _alphabet_norm_type() == "imagenet"

alphabet_cls: Optional[nn.Module] = None
class_mapping: Optional[dict] = None
_predict_call_count: int = 0

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
    
    # Try to get numeric keys (class indices) from mapping
    mx = -1
    for k in cm:
        try:
            mx = max(mx, int(k))
        except (TypeError, ValueError):
            continue
    if mx >= 0:
        return mx + 1
    
    # If class_mapping has non-numeric keys (like letter names), return its length
    if isinstance(cm, dict) and len(cm) >= 25:  # At least 25 entries for A-Z
        return len(cm)
    
    # Default to 29 for ASL alphabet (A-Z + del + space)
    return 29


def _strip_dataparallel_state_dict(sd: dict) -> dict:
    if not isinstance(sd, dict):
        return sd
    if not any(isinstance(k, str) and k.startswith("module.") for k in sd):
        return sd
    return {k.replace("module.", "", 1): v for k, v in sd.items() if isinstance(v, torch.Tensor)}


def _strip_common_checkpoint_prefix(sd: dict) -> dict:
    """Strip nested prefixes (``model.``, ``features.``, …) until keys match a flat ``Sequential``."""
    cur: dict = dict(sd)
    prefixes = (
        "model.",
        "module.",
        "student_model.",
        "net.",
        "classifier.",
        "features.",
        "conv_base.",
        "cnn.",
    )
    while True:
        keys = [k for k in cur if isinstance(k, str)]
        if not keys:
            return cur
        stripped = False
        for prefix in prefixes:
            if all(k.startswith(prefix) for k in keys):
                cur = {k[len(prefix) :]: v for k, v in cur.items()}
                stripped = True
                break
        if not stripped:
            return cur


def _linear_weight_shapes(sd: dict) -> list[tuple[str, int, int]]:
    rows: list[tuple[str, int, int]] = []
    for k, v in sd.items():
        if not isinstance(v, torch.Tensor) or v.dim() != 2:
            continue
        if not str(k).endswith("weight"):
            continue
        o, i = int(v.shape[0]), int(v.shape[1])
        rows.append((str(k), o, i))
    return rows


def _has_convolutional_weights(sd: dict) -> bool:
    """
    True if the state dict contains convolutional layers.

    Do not rely on the substring ``conv`` in key names — Kaggle / Sequential models
    often use numeric keys like ``0.weight`` for ``Conv2d`` (4D weights).
    """
    for k, v in sd.items():
        if not isinstance(v, torch.Tensor):
            continue
        if v.dim() == 4 and str(k).endswith("weight"):
            return True
        lk = str(k).lower()
        if v.dim() >= 2 and ("conv" in lk or "depthwise" in lk or "pointwise" in lk):
            return True
    return False


def _discover_head_configs(sd: dict, n_classes_hint: int) -> list[tuple[int, Optional[int], int]]:
    """
    Discover (flat_dim, hidden_dim or None, n_classes) from 2D *weight tensors.

    Supports:
    - Two-layer head: ``Linear(flat, hidden)`` then ``Linear(hidden, n_classes)``
    - Single layer: ``Linear(flat, n_classes)`` (weight shape ``(n_classes, flat)``)
    - ``n_classes`` inferred from the checkpoint when JSON hint is wrong (e.g. 250).
    """
    mats = _linear_weight_shapes(sd)
    seen: set[tuple[int, Optional[int], int]] = set()
    out: list[tuple[int, Optional[int], int]] = []

    def addcfg(flat: int, hid: Optional[int], ncls: int) -> None:
        if flat <= 0 or ncls <= 0:
            return
        t = (flat, hid, ncls)
        if t in seen:
            return
        seen.add(t)
        out.append(t)

    # --- Fast path: ``classifier.{idx}.weight`` chains (e.g. 256→512→256→29) ---
    cls_blocks: list[tuple[int, torch.Tensor]] = []
    for k, v in sd.items():
        if not isinstance(k, str) or not isinstance(v, torch.Tensor):
            continue
        m = re.match(r"^classifier\.(\d+)\.weight$", k)
        if m and v.dim() == 2:
            cls_blocks.append((int(m.group(1)), v))
    cls_blocks.sort(key=lambda x: x[0])
    cls_ws = [w for _, w in cls_blocks]
    if len(cls_ws) >= 2:
        conv_flat = int(cls_ws[0].shape[1])
        n_out = int(cls_ws[-1].shape[0])
        penult: Optional[int] = int(cls_ws[-2].shape[0]) if len(cls_ws) >= 2 else None
        if 15 <= n_out <= 64 and conv_flat > 0:
            addcfg(conv_flat, penult, n_out)

    # --- Discover actual output dimensions from weights (may differ from hint) ---
    actual_output_dims = set()
    for _, o, i in mats:
        if 15 <= o <= 48 and i >= 64:  # Likely classifier layer
            actual_output_dims.add(o)
    
    # Prefer actual discovered dimensions over hint
    effective_hint = n_classes_hint
    if len(actual_output_dims) == 1:
        effective_hint = list(actual_output_dims)[0]

    # --- Direct classifier: rows = n_classes, cols = flat (flat is large) ---
    for _, o, i in mats:
        if 15 <= o <= 48 and i >= 1024:
            addcfg(i, None, o)

    # --- Two-layer: find (n_cls, hidden) then (hidden, flat) ---
    for _, n_cls, hidden in mats:
        if not (15 <= n_cls <= 48):
            continue
        if hidden <= 0 or hidden >= 65536:
            continue
        for _, o2, in_feat in mats:
            # ``Linear(in, out)`` weight shape ``(out, in)`` — need ``in`` larger than bottleneck ``hidden``
            # when it feeds the last layer (e.g. (256,512) with hidden=256 from last (29,256)).
            if o2 == hidden and in_feat > hidden:
                addcfg(in_feat, hidden, n_cls)

    # --- Bias hint from JSON: still try two-layer with hinted class count ---
    if effective_hint > 0 and effective_hint != n_classes_hint:
        for _, o, hidden in mats:
            if o != effective_hint:
                continue
            if hidden >= 65536:
                continue
            for _, o2, in_feat in mats:
                if o2 == hidden and in_feat > hidden:
                    addcfg(in_feat, hidden, effective_hint)

    return out[:64]


def _build_uniform_cnn_sequential(
    num_pool: int,
    ch: int,
    flat: int,
    hidden: int,
    n_classes: int,
    use_bn: bool,
) -> nn.Module:
    """Conv→(BN)→ReLU→Pool × num_pool, then Flatten→Linear→ReLU→Linear (matches typical Kaggle exports)."""
    parts: list[nn.Module] = []
    cin = 3
    for _ in range(num_pool):
        parts.append(nn.Conv2d(cin, ch, 3, padding=1))
        if use_bn:
            parts.append(nn.BatchNorm2d(ch))
        parts.extend([nn.ReLU(inplace=True), nn.MaxPool2d(2)])
        cin = ch
    parts.append(nn.Flatten())
    parts.append(nn.Linear(flat, hidden))
    parts.append(nn.ReLU(inplace=True))
    parts.append(nn.Linear(hidden, n_classes))
    return nn.Sequential(*parts)


def _build_uniform_cnn_direct(
    num_pool: int,
    ch: int,
    flat: int,
    n_classes: int,
    use_bn: bool,
) -> nn.Module:
    """Conv tower → Flatten → single ``Linear(flat, n_classes)`` (no hidden FC)."""
    parts: list[nn.Module] = []
    cin = 3
    for _ in range(num_pool):
        parts.append(nn.Conv2d(cin, ch, 3, padding=1))
        if use_bn:
            parts.append(nn.BatchNorm2d(ch))
        parts.extend([nn.ReLU(inplace=True), nn.MaxPool2d(2)])
        cin = ch
    parts.append(nn.Flatten())
    parts.append(nn.Linear(flat, n_classes))
    return nn.Sequential(*parts)


def _build_uniform_conv_tail_only(num_pool: int, ch: int, flat: int, use_bn: bool) -> nn.Module:
    """Conv tower + Flatten only (no ``Linear``); output dimension must equal ``flat``."""
    parts: list[nn.Module] = []
    cin = 3
    for _ in range(num_pool):
        parts.append(nn.Conv2d(cin, ch, 3, padding=1))
        if use_bn:
            parts.append(nn.BatchNorm2d(ch))
        parts.extend([nn.ReLU(inplace=True), nn.MaxPool2d(2)])
        cin = ch
    parts.append(nn.Flatten())
    return nn.Sequential(*parts)


def _sd_leading_indices(sd: dict) -> list[int]:
    found: set[int] = set()
    for k in sd:
        m = re.match(r"^(\d+)\.", str(k))
        if m:
            found.add(int(m.group(1)))
    return sorted(found)


def _sd_block_tensors(sd: dict, idx: int) -> dict[str, torch.Tensor]:
    p = f"{idx}."
    out: dict[str, torch.Tensor] = {}
    for k, v in sd.items():
        if not str(k).startswith(p):
            continue
        if isinstance(v, torch.Tensor):
            out[str(k[len(p) :])] = v
    return out


def _conv2d_from_block(block: dict[str, torch.Tensor], in_ch: int) -> Optional[nn.Conv2d]:
    w = block.get("weight")
    if not isinstance(w, torch.Tensor) or w.dim() != 4:
        return None
    oc, ic, kh, kw = (int(x) for x in w.shape)
    if ic != in_ch:
        return None
    bias = "bias" in block
    if kh == kw and kh % 2 == 1:
        pad = kh // 2
        padding = (pad, pad)
    else:
        padding = (0, 0)
    return nn.Conv2d(ic, oc, (kh, kw), stride=1, padding=padding, bias=bias)


def _bn2d_from_block(block: dict[str, torch.Tensor]) -> Optional[nn.BatchNorm2d]:
    w = block.get("weight")
    if not isinstance(w, torch.Tensor) or w.dim() != 1:
        return None
    if "running_mean" not in block or "running_var" not in block:
        return None
    nf = int(w.shape[0])
    return nn.BatchNorm2d(nf, affine=True, track_running_stats=True)


def _fill_feature_index_gaps(
    od: OrderedDict, prev_idx: int, curr_idx: int, mode: str
) -> None:
    """
    Insert parameterless modules at missing indices between ``prev_idx`` and ``curr_idx``.

    Kaggle / hand-built CNNs differ: some blocks use ``ReLU`` only between BN and the next
    ``Conv`` (stride-2 conv does downsampling); others use ``ReLU`` + ``MaxPool``. We try
    several ``mode`` values at load time until the flattened feature dim matches the head.
    """
    gap = curr_idx - prev_idx - 1
    for g in range(gap):
        si = prev_idx + 1 + g
        if mode == "relu_pool_alt":
            od[str(si)] = nn.ReLU(inplace=True) if g % 2 == 0 else nn.MaxPool2d(2)
        elif mode == "relu_only":
            od[str(si)] = nn.ReLU(inplace=True)
        elif mode == "pool_relu_alt":
            od[str(si)] = nn.MaxPool2d(2) if g % 2 == 0 else nn.ReLU(inplace=True)
        elif mode == "pool_only":
            od[str(si)] = nn.MaxPool2d(2)
        elif mode == "two_relu_then_pool":
            if g % 3 < 2:
                od[str(si)] = nn.ReLU(inplace=True)
            else:
                od[str(si)] = nn.MaxPool2d(2)
        elif mode == "pool_two_relu":
            if g % 3 == 0:
                od[str(si)] = nn.MaxPool2d(2)
            else:
                od[str(si)] = nn.ReLU(inplace=True)
        elif mode == "relu_avg_alt":
            od[str(si)] = nn.ReLU(inplace=True) if g % 2 == 0 else nn.AvgPool2d(2)
        else:
            od[str(si)] = nn.ReLU(inplace=True) if g % 2 == 0 else nn.MaxPool2d(2)


_FEATURE_GAP_MODES: tuple[str, ...] = (
    "relu_pool_alt",
    "relu_only",
    "pool_relu_alt",
    "pool_only",
    "two_relu_then_pool",
    "pool_two_relu",
    "relu_avg_alt",
)


def _build_features_sequential_from_state_dict(
    feat_sd: dict, gap_mode: str = "relu_pool_alt", trailing_relu: bool = True
) -> Optional[nn.Sequential]:
    """
    Rebuild ``features.*`` from tensors at ``0.weight``, ``1.weight``, … plus parameterless
    gaps so submodule names match the saved checkpoint.

    ``trailing_relu=True`` appends a ReLU after the last BN/Conv if the block ends there.
    This matches every common CNN architecture where ``features`` ends with a BN and the
    ReLU that follows it is absent from the state dict (no learnable parameters).
    """
    idxs = _sd_leading_indices(feat_sd)
    if not idxs or idxs[0] != 0:
        return None
    od: OrderedDict[str, nn.Module] = OrderedDict()
    in_ch = 3
    prev = -1
    last_is_bn_or_conv = False
    for idx in idxs:
        if prev >= 0:
            _fill_feature_index_gaps(od, prev, idx, gap_mode)
        block = _sd_block_tensors(feat_sd, idx)
        if not block:
            return None
        conv = _conv2d_from_block(block, in_ch)
        if conv is not None:
            od[str(idx)] = conv
            in_ch = int(conv.out_channels)
            prev = idx
            last_is_bn_or_conv = True
            continue
        bn = _bn2d_from_block(block)
        if bn is not None:
            if int(bn.num_features) != in_ch:
                return None
            od[str(idx)] = bn
            prev = idx
            last_is_bn_or_conv = True
            continue
        last_is_bn_or_conv = False
        return None

    if trailing_relu and last_is_bn_or_conv and prev >= 0:
        # Almost every CNN features block ends with BN → ReLU; ReLU has no state → not in dict.
        # Without this trailing ReLU, adaptive_avg_pool2d operates on raw BN output (includes
        # negatives), which shifts the classifier's feature distribution far from training.
        od[str(prev + 1)] = nn.ReLU(inplace=True)

    seq = nn.Sequential(od)
    try:
        seq.load_state_dict(feat_sd, strict=True)
    except Exception as e:
        log.warning("Alphabet: features.* rebuild failed strict load: %s", e)
        return None
    return seq


def _cls_mod_from_block(block: dict[str, torch.Tensor]) -> Optional[nn.Module]:
    w = block.get("weight")
    if not isinstance(w, torch.Tensor):
        return None
    if w.dim() == 2:
        return nn.Linear(int(w.shape[1]), int(w.shape[0]), bias="bias" in block)
    if w.dim() == 1 and "running_mean" in block and "running_var" in block:
        return nn.BatchNorm1d(int(w.shape[0]), affine=True, track_running_stats=True)
    return None


def _build_classifier_ordered_cls_sd(cls_sd: dict) -> Optional[nn.Sequential]:
    """
    Rebuild ``classifier.*`` with submodule names matching the checkpoint (e.g. ``1``, ``2``, ``5``).
    Inserts a single ``ReLU`` at ``prev+1`` when linear/BN indices are not consecutive.
    """
    idxs = _sd_leading_indices(cls_sd)
    if not idxs:
        return None
    od: OrderedDict[str, nn.Module] = OrderedDict()
    prev: Optional[int] = None
    for idx in idxs:
        if prev is not None and idx > prev + 1:
            od[str(prev + 1)] = nn.ReLU(inplace=True)
        block = _sd_block_tensors(cls_sd, idx)
        mod = _cls_mod_from_block(block)
        if mod is None:
            return None
        od[str(idx)] = mod
        prev = idx
    seq = nn.Sequential(od)
    try:
        seq.load_state_dict(cls_sd, strict=True)
    except Exception as e:
        log.warning("Alphabet: classifier.* rebuild failed strict load: %s", e)
        return None
    return seq


class _FeaturesClassifierNet(nn.Module):
    """``features.*`` conv stack + ``classifier.*`` MLP (typical Kaggle / torchvision layout)."""

    def __init__(
        self,
        features: nn.Module,
        classifier: nn.Module,
        *,
        adaptive_avg_before_flat: bool = False,
    ):
        super().__init__()
        self.features = features
        self.classifier = classifier
        self.adaptive_avg_before_flat = bool(adaptive_avg_before_flat)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        if x.dim() > 2:
            if self.adaptive_avg_before_flat:
                x = F.adaptive_avg_pool2d(x, (1, 1))
            x = torch.flatten(x, 1)
        return self.classifier(x)


def _first_linear_in_module(m: nn.Module) -> Optional[nn.Linear]:
    for child in m.children():
        if isinstance(child, nn.Linear):
            return child
    return None


def _candidate_input_sides(img_size_hint: Optional[int]) -> tuple[int, ...]:
    """
    Try training-sized inputs first. A too-small ``side`` can still match channel counts when a
    synthetic global pool is used at load time, but it is the wrong resolution at inference.
    """
    rest: set[int] = set(range(32, 513, 4))
    rest.update(
        (
            224,
            227,
            229,
            256,
            128,
            96,
            64,
            160,
            192,
            176,
            200,
            208,
            240,
            288,
            320,
            384,
            48,
            56,
            72,
            80,
            88,
            104,
            120,
            136,
            152,
            168,
            184,
            212,
            236,
            244,
            252,
        )
    )
    ordered: list[int] = []
    seen: set[int] = set()

    def add(h: int) -> None:
        if 16 <= h <= 512 and h not in seen:
            seen.add(h)
            ordered.append(h)

    if img_size_hint is not None:
        try:
            add(int(img_size_hint))
        except (TypeError, ValueError):
            pass
    for s in (224, 256, 192, 128, 160, 112, 96, 240, 200, 176, 208, 320, 288, 384):
        add(s)
    for s in sorted(rest):
        add(s)
    return tuple(ordered)


def _try_load_hardcoded_asl_classifier_cnn(
    feat_sd: dict, cls_sd: dict
) -> Optional[nn.Module]:
    """
    Load the exact ASLClassifierCNN architecture for SignVerse.

    The architecture was derived directly from the checkpoint state-dict analysis
    (see startup log line: "Alphabet: features.* layout"):
      Conv indices : 0, 3, 8, 11, 16, 19, 24
      BN   indices : 1, 4, 9, 12, 17, 20, 25
      Channel progression : 3→ch0, ch0→ch0, ch0→ch1, ch1→ch1,
                            ch1→ch2, ch2→ch2, ch2→ch3   (ch3 = last features dim)
      Gap pattern  : (Conv-BN-ReLU)×2 → MaxPool → (repeat ×3) → trailing ReLU
      Classifier   : Dropout(0) → Linear(1) → BN1d(2) → ReLU(3) → Dropout(4)
                     → Linear(5) → BN1d(6) → ReLU(7) → Dropout(8) → Linear(9)

    This function reads the actual channel sizes from the weight tensors so it
    works even if the training used different widths.  strict=True loading
    guarantees the weights are applied exactly.
    """
    # ── Read actual Conv weight shapes ──────────────────────────────────────
    CONV_INDICES = [0, 3, 8, 11, 16, 19, 24]
    CLS_LIN_IDX  = [1, 5, 9]

    try:
        ch: list[int] = []
        for ci in CONV_INDICES:
            w = feat_sd.get(f"{ci}.weight")
            if not isinstance(w, torch.Tensor) or w.dim() != 4:
                return None          # checkpoint doesn't match this architecture
            ch.append(int(w.shape[0]))   # out_channels

        last_w = cls_sd.get("9.weight")
        if last_w is None:
            return None
        lin1_w = cls_sd.get("1.weight")
        lin5_w = cls_sd.get("5.weight")
        if lin1_w is None or lin5_w is None:
            return None
        in_feat  = int(lin1_w.shape[1])   # = last features channels (256)
        hidden1  = int(lin1_w.shape[0])   # = 512
        hidden2  = int(lin5_w.shape[0])   # = 256
        n_out    = int(last_w.shape[0])   # = 29
    except Exception:
        return None

    # ── Build exact architecture ─────────────────────────────────────────────
    # Parameterless layers (ReLU, MaxPool, Dropout) have no state-dict entries,
    # so strict=True only verifies that every Conv/BN key is present – which it is.
    in3 = 3          # input channels (RGB)
    features = nn.Sequential(OrderedDict([
        ("0",  nn.Conv2d(in3,   ch[0], 3, padding=1)),
        ("1",  nn.BatchNorm2d(ch[0])),
        ("2",  nn.ReLU(inplace=True)),
        ("3",  nn.Conv2d(ch[0], ch[1], 3, padding=1)),
        ("4",  nn.BatchNorm2d(ch[1])),
        ("5",  nn.ReLU(inplace=True)),
        ("6",  nn.MaxPool2d(2, 2)),
        ("7",  nn.ReLU(inplace=True)),   # Dropout(0.5) in training → identity at eval
        ("8",  nn.Conv2d(ch[1], ch[2], 3, padding=1)),
        ("9",  nn.BatchNorm2d(ch[2])),
        ("10", nn.ReLU(inplace=True)),
        ("11", nn.Conv2d(ch[2], ch[3], 3, padding=1)),
        ("12", nn.BatchNorm2d(ch[3])),
        ("13", nn.ReLU(inplace=True)),
        ("14", nn.MaxPool2d(2, 2)),
        ("15", nn.ReLU(inplace=True)),   # Dropout(0.5) → identity at eval
        ("16", nn.Conv2d(ch[3], ch[4], 3, padding=1)),
        ("17", nn.BatchNorm2d(ch[4])),
        ("18", nn.ReLU(inplace=True)),
        ("19", nn.Conv2d(ch[4], ch[5], 3, padding=1)),
        ("20", nn.BatchNorm2d(ch[5])),
        ("21", nn.ReLU(inplace=True)),
        ("22", nn.MaxPool2d(2, 2)),
        ("23", nn.ReLU(inplace=True)),   # Dropout(0.5) → identity at eval
        ("24", nn.Conv2d(ch[5], ch[6], 3, padding=1)),
        ("25", nn.BatchNorm2d(ch[6])),
        ("26", nn.ReLU(inplace=True)),
    ]))
    classifier = nn.Sequential(OrderedDict([
        ("0", nn.Dropout(0.5)),
        ("1", nn.Linear(in_feat, hidden1)),
        ("2", nn.BatchNorm1d(hidden1)),
        ("3", nn.ReLU(inplace=True)),
        ("4", nn.Dropout(0.5)),
        ("5", nn.Linear(hidden1, hidden2)),
        ("6", nn.BatchNorm1d(hidden2)),
        ("7", nn.ReLU(inplace=True)),
        ("8", nn.Dropout(0.5)),
        ("9", nn.Linear(hidden2, n_out)),
    ]))

    try:
        features.load_state_dict(feat_sd, strict=True)
        classifier.load_state_dict(cls_sd, strict=True)
    except Exception as e:
        log.warning("Hardcoded ASLClassifierCNN strict load failed: %s", e)
        return None

    # Diagnostic: log the first BN2d running_mean to confirm the training pixel
    # scale.  If mean >> 1 (e.g. 10–100), the model was trained on [0,255] raw
    # pixel values and inference must NOT divide by 255.  If mean < 1, training
    # used [0,1] (ToTensor) and the fix below must be revisited.
    first_bn_mean = feat_sd.get("1.running_mean")
    if first_bn_mean is not None and isinstance(first_bn_mean, torch.Tensor):
        log.info(
            "Alphabet BN[0] running_mean: min=%.3f  max=%.3f  mean=%.3f  "
            "(>1 confirms model trained on [0,255] pixel range; <1 means [0,1])",
            float(first_bn_mean.min()),
            float(first_bn_mean.max()),
            float(first_bn_mean.mean()),
        )

    net = _FeaturesClassifierNet(features, classifier, adaptive_avg_before_flat=True)
    setattr(net, "_signverse_input_side", 128)
    log.info(
        "Alphabet: loaded via hardcoded ASLClassifierCNN "
        "(ch=%s in=%d h=[%d,%d] n_cls=%d)",
        ch, in_feat, hidden1, hidden2, n_out,
    )
    return net


def _try_load_features_classifier_split(
    sd0: dict, n_classes: int, img_size_hint: Optional[int] = None
) -> Optional[nn.Module]:
    """Load checkpoints that store tensors under ``features.*`` and ``classifier.*`` separately."""
    if not any(k.startswith("features.") for k in sd0):
        return None
    if not any(k.startswith("classifier.") for k in sd0):
        return None

    feat_sd = {k[len("features.") :]: v for k, v in sd0.items() if k.startswith("features.")}
    cls_sd = {k[len("classifier.") :]: v for k, v in sd0.items() if k.startswith("classifier.")}

    # ── Fast path: try the hardcoded ASLClassifierCNN architecture first ────
    # This matches SignVerse's trained checkpoint exactly (7 conv blocks,
    # classifier with Linear indices 1/5/9).  strict=True guarantees correctness.
    hardcoded_net = _try_load_hardcoded_asl_classifier_cnn(feat_sd, cls_sd)
    if hardcoded_net is not None:
        return hardcoded_net

    # Log the complete index→shape map so the architecture is visible in startup logs.
    conv_info = {
        int(re.match(r"^(\d+)\.weight$", k).group(1)): tuple(int(x) for x in v.shape)
        for k, v in feat_sd.items()
        if re.match(r"^(\d+)\.weight$", k) and isinstance(v, torch.Tensor) and v.dim() == 4
    }
    bn_idxs = sorted(
        int(re.match(r"^(\d+)\.running_mean$", k).group(1))
        for k in feat_sd
        if re.match(r"^(\d+)\.running_mean$", k)
    )
    conv_summary = " ".join(f"{i}:({v[1]}→{v[0]})" for i, v in sorted(conv_info.items()))
    log.info(
        "Alphabet: features.* layout — Conv@[%s]  BN@%s  total_feat_keys=%d",
        conv_summary,
        bn_idxs,
        len(feat_sd),
    )
    cls_idxs = sorted(
        int(re.match(r"^(\d+)\.weight$", k).group(1))
        for k in cls_sd
        if re.match(r"^(\d+)\.weight$", k)
    )
    log.info("Alphabet: classifier.* parametric indices (weight) = %s", cls_idxs)

    cls_head = _build_classifier_ordered_cls_sd(cls_sd)
    if cls_head is None:
        return None

    first_lin = _first_linear_in_module(cls_head)
    if first_lin is None:
        return None
    expected_flat = int(first_lin.in_features)

    last_lin: Optional[nn.Linear] = None
    for m in cls_head.modules():
        if isinstance(m, nn.Linear):
            last_lin = m
    if last_lin is not None and int(last_lin.out_features) != int(n_classes):
        log.info(
            "Alphabet: classifier last Linear out_features=%s (JSON/hint n_classes=%s); using checkpoint.",
            last_lin.out_features,
            n_classes,
        )

    sides = _candidate_input_sides(img_size_hint)

    # Many Kaggle CNNs end with: …Conv → BN → ReLU → AdaptiveAvgPool(1,1).
    # The trailing ReLU has no state → not in feat_sd → must be appended explicitly.
    for adaptive_tail in (True, False):
        for trailing_relu in (True, False):
            for gap_mode in _FEATURE_GAP_MODES:
                feat_mod = _build_features_sequential_from_state_dict(
                    feat_sd, gap_mode, trailing_relu
                )
                if feat_mod is None:
                    continue

                for side in sides:
                    try:
                        with torch.no_grad():
                            y = feat_mod(torch.zeros(1, 3, int(side), int(side)))
                            if adaptive_tail and y.dim() == 4:
                                y = F.adaptive_avg_pool2d(y, (1, 1))
                            yf = torch.flatten(y, 1) if y.dim() > 2 else y
                        if int(yf.shape[1]) != expected_flat:
                            # Channel count is resolution-independent with global pool.
                            if adaptive_tail and y.dim() == 4:
                                break
                            continue
                    except Exception:
                        continue

                    net = _FeaturesClassifierNet(
                        feat_mod,
                        cls_head,
                        adaptive_avg_before_flat=adaptive_tail,
                    )
                    if adaptive_tail:
                        if img_size_hint is not None:
                            try:
                                hi = int(img_size_hint)
                                if 16 <= hi <= 512:
                                    setattr(net, "_signverse_input_side", hi)
                                else:
                                    setattr(net, "_signverse_input_side", 224)
                            except (TypeError, ValueError):
                                setattr(net, "_signverse_input_side", 224)
                        else:
                            setattr(net, "_signverse_input_side", 224)
                    else:
                        setattr(net, "_signverse_input_side", int(side))
                    log.info(
                        "Alphabet: loaded features.+classifier. split "
                        "(probe_side=%s infer_side=%s flat=%s gap_mode=%s "
                        "adaptive_avg_tail=%s trailing_relu=%s)",
                        side,
                        getattr(net, "_signverse_input_side", None),
                        expected_flat,
                        gap_mode,
                        adaptive_tail,
                        trailing_relu,
                    )
                    return net

    # Diagnostic: log what a probe forward actually produces so the next fix is obvious.
    try:
        probe = _build_features_sequential_from_state_dict(feat_sd, "relu_pool_alt", True)
        if probe is not None:
            for probe_side in (224, 128, 64):
                try:
                    with torch.no_grad():
                        yp = probe(torch.zeros(1, 3, probe_side, probe_side))
                        yp_gap = F.adaptive_avg_pool2d(yp, (1, 1)) if yp.dim() == 4 else yp
                        flat_probe = int(torch.flatten(yp_gap, 1).shape[1])
                    log.warning(
                        "Alphabet: no combo matched flat=%s; "
                        "probe relu_pool_alt+trailingReLU+adaptive @%s → dim=%s",
                        expected_flat,
                        probe_side,
                        flat_probe,
                    )
                    break
                except Exception:
                    pass
    except Exception:
        log.warning(
            "Alphabet: no (gap_mode, trailing_relu, side, adaptive_tail) matched flat=%s (probe failed)",
            expected_flat,
        )

    return None


def _try_signverse_custom_sequential_cnn(
    sd: dict, n_classes: int, img_size_hint: Optional[int] = None
) -> Optional[nn.Module]:
    """
    Load ``ASLClassifierCNN``-style checkpoints: can be pure FC-only or Conv+FC.
    """
    sd0 = _strip_common_checkpoint_prefix(_strip_dataparallel_state_dict(sd))
    sd0 = {k: v for k, v in sd0.items() if isinstance(v, torch.Tensor)}
    if not sd0:
        return None

    split_net = _try_load_features_classifier_split(sd0, n_classes, img_size_hint)
    if split_net is not None:
        return split_net

    all_keys = list(sd0.keys())
    fc_keys = [k for k in all_keys if "classifier" in k or "fc" in k.lower() or "linear" in k.lower()]
    batch_norm_keys = [k for k in all_keys if "bn" in k or "batch_norm" in k.lower()]
    has_conv = _has_convolutional_weights(sd0)
    n_conv4d = sum(
        1 for k, v in sd0.items() if isinstance(v, torch.Tensor) and v.dim() == 4 and str(k).endswith("weight")
    )

    log.info(
        "State dict layout: tensors=%d has_conv_4d=%d conv4d_weights=%d fc_key_hits=%d bn_key_hits=%d",
        len(sd0),
        int(has_conv),
        n_conv4d,
        len(fc_keys),
        len(batch_norm_keys),
    )
    
    # Extract all Linear (FC) layers
    fc_layers = []
    for key in sorted(sd0.keys()):
        if key.endswith(".weight") and ("classifier" in key or "fc" in key.lower() or "linear" in key.lower()):
            tensor = sd0[key]
            if tensor.dim() == 2:
                out_features, in_features = tensor.shape
                fc_layers.append((key, in_features, out_features))
    
    # ─────────────────────────────────────────────────────────────
    # STRATEGY 1: Build pure FC model ONLY if NO conv layers detected
    # ─────────────────────────────────────────────────────────────
    if not has_conv and fc_layers:
        last_layer_outputs = fc_layers[-1][2]
        if last_layer_outputs == 29 or last_layer_outputs == n_classes:
            log.warning(
                "Checkpoint has only fully-connected weights (%s) and no 4D conv weights. "
                "Images cannot be classified without the same backbone used in training. "
                "Re-export ``torch.save(model, ...)`` including all layers, or ship ``model_state_dict`` "
                "with conv/feature tensors (keys may be numeric, e.g. ``0.weight``).",
                [x[0] for x in fc_layers],
            )
    elif has_conv:
        log.info("Convolutional weights present — loading full CNN (not FC-only shortcut)")

    # ─────────────────────────────────────────────────────────────
    # STRATEGY 2: Try standard architectures (Conv+FC hybrid)
    # ─────────────────────────────────────────────────────────────
    configs = _discover_head_configs(sd0, n_classes)
    if not configs:
        mats = _linear_weight_shapes(sd0)
        log.warning(
            "ASL CNN: could not infer Linear head from checkpoint (hint n_classes=%s). "
            "2D weight tensors: %s",
            n_classes,
            [(k, o, i) for k, o, i in mats[:12]],
        )
        return None

    has_bn = any("running_mean" in k for k in sd0)
    use_bn_opts = (True, False) if has_bn else (False,)

    for flat, hidden, n_cls in configs:
        for use_bn in use_bn_opts:
            for num_pool in (1, 2, 3, 4):
                for ch in range(2, 257, 2):
                    if flat % ch != 0:
                        continue
                    r = flat // ch
                    h = int(math.isqrt(r))
                    if h * h != r:
                        continue
                    side = h * (2**num_pool)
                    if side < 32 or side > 512:
                        continue
                    if hidden is None:
                        m = _build_uniform_cnn_direct(num_pool, ch, flat, n_cls, use_bn)
                    else:
                        m = _build_uniform_cnn_sequential(num_pool, ch, flat, hidden, n_cls, use_bn)
                    try:
                        m.load_state_dict(sd0, strict=True)
                    except Exception:
                        continue
                    setattr(m, "_signverse_input_side", int(side))
                    log.info(
                        "Alphabet: matched custom CNN (pools=%s side=%s ch=%s flat=%s hidden=%s n_cls=%s bn=%s)",
                        num_pool,
                        side,
                        ch,
                        flat,
                        hidden,
                        n_cls,
                        use_bn,
                    )
                    return m

    log.warning(
        "ASL CNN auto-load: tried %s head configs, no spatial layout matched. Sample keys: %s",
        len(configs),
        list(sd0.keys())[:24],
    )
    return None


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

    # ─────────────────────────────────────────────────────────────
    # Try to use config to rebuild the model if available
    # ─────────────────────────────────────────────────────────────
    img_size_hint: Optional[int] = None
    if "config" in loaded and isinstance(loaded.get("config"), dict):
        config = loaded["config"]
        log.info("Found model config in checkpoint: %s", list(config.keys())[:10])
        raw_sz = config.get("img_size")
        if raw_sz is not None:
            try:
                img_size_hint = int(raw_sz)
            except (TypeError, ValueError):
                img_size_hint = None

    candidates: list[dict] = []
    for key in ("state_dict", "model_state_dict", "model"):
        inner = loaded.get(key)
        if isinstance(inner, dict) and inner:
            td = {k: v for k, v in inner.items() if isinstance(v, torch.Tensor)}
            if td:
                # Log detailed analysis of this state dict
                has_c = _has_convolutional_weights(td)
                fc_keys = [k for k in td if "classifier" in k or "fc" in k.lower()]
                conv4d = [k for k, v in td.items() if isinstance(v, torch.Tensor) and v.dim() == 4][:5]
                log.info(
                    "State dict '%s': total=%d has_conv_4d=%s fc_key_hits=%d sample_4d=%s",
                    key,
                    len(td),
                    has_c,
                    len(fc_keys),
                    conv4d,
                )
                if fc_keys:
                    log.info("  Sample fc keys: %s", fc_keys[:3])
                candidates.append(td)
    if all(isinstance(v, torch.Tensor) for v in loaded.values()):
        candidates.append({k: v for k, v in loaded.items()})

    seen: set[int] = set()
    for td in candidates:
        tid = id(td)
        if tid in seen:
            continue
        seen.add(tid)
        mod = _try_load_alphabet_from_state_dict(td, n_classes)
        if mod is not None:
            return mod
        mod = _try_signverse_custom_sequential_cnn(td, n_classes, img_size_hint)
        if mod is not None:
            return mod
    return None


def _alphabet_forward_logits(model: nn.Module, x: torch.Tensor) -> torch.Tensor:
    global _predict_call_count
    x = x.to(DEVICE)
    model.eval()
    with torch.no_grad():
        # On the first 3 predictions log intermediate feature stats to diagnose
        # architecture / normalization issues.
        debug_this = _predict_call_count < 3
        if debug_this and isinstance(model, _FeaturesClassifierNet):
            feats = model.features(x)
            if feats.dim() == 4 and model.adaptive_avg_before_flat:
                feats_pool = torch.nn.functional.adaptive_avg_pool2d(feats, (1, 1))
            else:
                feats_pool = feats
            flat = torch.flatten(feats_pool, 1)
            log.info(
                "DEBUG forward #%d: feats shape=%s pool-flat mean=%.4f std=%.4f min=%.4f max=%.4f",
                _predict_call_count,
                tuple(feats.shape),
                flat.mean().item(),
                flat.std().item(),
                flat.min().item(),
                flat.max().item(),
            )
        out = model(x)
    _predict_call_count += 1
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
            data = json.load(f)
        
        # Handle nested structure from the notebook ({"root": {"classes": [...]}})
        if isinstance(data, dict):
            if "root" in data and isinstance(data["root"], dict):
                # Nested: {"root": {"classes": ["A", "B", ...]}}
                root = data["root"]
                if "classes" in root and isinstance(root["classes"], list):
                    classes = root["classes"]
                    class_mapping = {str(i): c for i, c in enumerate(classes)}
                    log.info("Extracted class_mapping from nested structure (has %d classes)", len(class_mapping))
                else:
                    class_mapping = data
            else:
                # Flat structure
                class_mapping = data
        
        # Log class mapping info for debugging
        cm_len = len(class_mapping) if isinstance(class_mapping, dict) else 0
        if cm_len < 25:
            log.warning(
                "class_mapping.json has only %d entries (expected ~29 for ASL). "
                "Will try to extract from checkpoint.", cm_len
            )

    alphabet_cls = None
    cls_path = os.path.join(MODEL_DIR, "signverse_asl_classifier.pt")
    if os.path.exists(cls_path):
        try:
            import json
            raw = _alphabet_torch_load(cls_path)
            if isinstance(raw, dict):
                n_tensor = sum(1 for v in raw.values() if isinstance(v, torch.Tensor))
                log.info(
                    "signverse_asl_classifier.pt: root=dict keys=%s tensor_values=%s",
                    list(raw.keys())[:30],
                    n_tensor,
                )
                
                # Prefer ordered ``classes`` list (matches ``model`` output index order).
                if "classes" in raw and isinstance(raw["classes"], (list, tuple)) and len(raw["classes"]) >= 25:
                    class_mapping = {str(i): str(c) for i, c in enumerate(raw["classes"])}
                    log.info("Using checkpoint 'classes' list for labels (%d entries)", len(class_mapping))
                # Else: class_to_idx from checkpoint
                elif "class_to_idx" in raw and isinstance(raw["class_to_idx"], dict):
                    checkpoint_mapping = raw["class_to_idx"]
                    if len(checkpoint_mapping) >= 25:  # Valid mapping
                        # Check if it's class->idx or idx->class mapping
                        sample_key = next(iter(checkpoint_mapping))
                        if isinstance(sample_key, str) and not sample_key.isdigit():
                            # It's class->idx (like {"A": 0, "B": 1}), need to invert
                            class_mapping = {str(v): k for k, v in checkpoint_mapping.items()}
                            log.info("Using inverted class_to_idx from checkpoint (has %d classes)", len(class_mapping))
                        else:
                            # It's already idx->class
                            class_mapping = {str(k): v for k, v in checkpoint_mapping.items()}
                            log.info("Using class_to_idx from checkpoint (has %d classes)", len(class_mapping))
                
            else:
                log.info("signverse_asl_classifier.pt: root type=%s", type(raw).__name__)

            n_cls = _infer_alphabet_num_classes(class_mapping)
            log.info("Attempting to load alphabet classifier with n_classes=%d", n_cls)
            mod = _unwrap_alphabet_checkpoint(raw, n_cls)
            if mod is not None:
                alphabet_cls = mod.to(DEVICE).eval()
                log.info("Alphabet classifier loaded for learning backend")
            else:
                log.error(
                    "Could not build a runnable module from signverse_asl_classifier.pt. "
                    "Expected: full nn.Module pickle, torchvision backbone state_dict, or a flat "
                    "Kaggle-style Sequential (custom CNN auto-detect). Tried multiple architectures."
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
        raise HTTPException(
            status_code=503,
            detail=(
                "Alphabet classifier is not loaded on the server (checkpoint format not recognized). "
                "See Space logs at startup — do not treat random-looking results as model output."
            ),
        )
    try:
        img_data = base64.b64decode(req.frame.split(",")[-1])
        arr = np.frombuffer(img_data, dtype=np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid frame")

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # ── Hand-crop: the CNN was trained on studio images where the hand
        #    fills the entire frame.  Detect and crop the hand region first.
        hand_crop = _get_hand_crop(rgb_frame)
        if hand_crop is not None:
            source_img = hand_crop
            log.debug("Hand detected — using crop %s", hand_crop.shape[:2])
        else:
            source_img = rgb_frame
            log.debug("No hand detected — using full frame")

        inferred_side = getattr(alphabet_cls, "_signverse_input_side", None)
        try:
            env_side = int(os.environ.get("ALPHABET_INPUT_SIZE", "0"))
        except ValueError:
            env_side = 0
        side = env_side if env_side > 0 else (inferred_side if inferred_side else 128)
        side = max(32, min(int(side), 640))
        resized = cv2.resize(source_img, (side, side))
        # Keep pixel values in [0, 255] — the training notebook loaded images
        # without dividing by 255, so the BN running_mean is calibrated for
        # that range.  Dividing by 255 here would push all activations to large
        # negative values that ReLU zeroes out, producing always-zero features.
        tensor = torch.tensor(resized, dtype=torch.float32).permute(2, 0, 1).unsqueeze(0)
        tensor = tensor.to(DEVICE)

        norm_type = _alphabet_norm_type()
        if norm_type == "imagenet255":
            # ImageNet stats in [0,255] space — use only if training applied this.
            mean = torch.tensor([123.675, 116.28, 103.53], device=DEVICE).view(1, 3, 1, 1)
            std  = torch.tensor([ 58.395,  57.12,  57.375], device=DEVICE).view(1, 3, 1, 1)
            tensor = (tensor - mean) / std
        elif norm_type == "half":
            # Legacy: divides [0,1]-range inputs to [-1,1]; tensor must first be /255.
            tensor = (tensor / 255.0 - 0.5) / 0.5
        # norm_type == "none" (default): keep raw [0,255] — no extra operation needed.

        log.debug(
            "Image preprocessed: shape=%s norm=%s mean=%.1f std=%.1f",
            tensor.shape,
            norm_type,
            tensor.mean().item(),
            tensor.std().item(),
        )

        logits = _alphabet_forward_logits(alphabet_cls, tensor)
        probs = torch.softmax(logits, dim=-1)[0]
        k = min(3, int(probs.numel()))
        top3v, top3i = probs.topk(k)
        letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ del space".split()

        def il(i: int) -> str:
            """Get label for index i."""
            ii = int(i)
            if class_mapping:
                # Try string key first
                lab = class_mapping.get(str(ii))
                if lab is not None:
                    return str(lab)
                # Try numeric key
                lab = class_mapping.get(ii)
                if lab is not None:
                    return str(lab)
            # Fallback to hardcoded letters
            return letters[ii] if ii < len(letters) else str(ii)

        predicted_letter = il(int(top3i[0]))
        confidence = round(float(top3v[0]), 3)
        
        # Log prediction details for debugging
        log.info(
            "Prediction: letter=%s, confidence=%.3f, top3=[%s]",
            predicted_letter,
            confidence,
            ", ".join(f"{il(int(i))}:{round(float(v), 3)}" for i, v in zip(top3i, top3v))
        )

        return {
            "letter": predicted_letter,
            "confidence": confidence,
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
            "Learning (integrated) ready | alphabet=%s | norm=%s | img_size=%s | "
            "hand_crop=%s | letter_image_folder=%s",
            alphabet_cls is not None,
            _alphabet_norm_type(),
            getattr(alphabet_cls, "_signverse_input_side", None) if alphabet_cls else None,
            _MP_HANDS_AVAILABLE,
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
            "Learning backend (standalone) | alphabet=%s | letter_image_folder=%s (optional)",
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
