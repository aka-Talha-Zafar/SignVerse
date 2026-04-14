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

Env: MODEL_DIR, HF_TOKEN, HF_MODELS_REPO, ASL_ALPHABET_DATASET_DIR, ASL_ALPHABET_REF_IMAGES_DIR,
     ALPHABET_NUM_CLASSES, ALPHABET_INPUT_SIZE, ALPHABET_IMAGENET_NORM, LEARNING_API_PORT
"""

from __future__ import annotations

import base64
import logging
import mimetypes
import math
import os
import random
import re
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
REF_IMAGES_DIR = os.environ.get(
    "ASL_ALPHABET_REF_IMAGES_DIR",
    os.path.join(os.path.dirname(__file__), "static", "alphabet_refs"),
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
        for _, o2, flat in mats:
            if o2 == hidden and flat > max(hidden * 2, 1024):
                addcfg(flat, hidden, n_cls)

    # --- Bias hint from JSON: still try two-layer with hinted class count ---
    if effective_hint > 0 and effective_hint != n_classes_hint:
        for _, o, hidden in mats:
            if o != effective_hint:
                continue
            if hidden >= 65536:
                continue
            for _, o2, flat in mats:
                if o2 == hidden and flat > max(hidden * 2, 1024):
                    addcfg(flat, hidden, effective_hint)

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


class _FeaturesClassifierNet(nn.Module):
    """``features.*`` conv stack + ``classifier.*`` MLP (typical Kaggle / torchvision layout)."""

    def __init__(self, features: nn.Module, classifier: nn.Module):
        super().__init__()
        self.features = features
        self.classifier = classifier

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        if x.dim() > 2:
            x = torch.flatten(x, 1)
        return self.classifier(x)


def _build_classifier_from_cls_sd(cls_sd: dict) -> Optional[nn.Module]:
    """Rebuild ``classifier`` from keys like ``1.weight``, ``5.weight`` (gaps = ReLU, no state)."""
    lin_ids: list[int] = []
    for k, v in cls_sd.items():
        m = re.match(r"^(\d+)\.weight$", k)
        if m and isinstance(v, torch.Tensor) and v.dim() == 2:
            lin_ids.append(int(m.group(1)))
    if not lin_ids:
        return None
    lin_ids.sort()
    layers: list[nn.Module] = []
    for j, oid in enumerate(lin_ids):
        w = cls_sd[f"{oid}.weight"]
        in_f, out_f = int(w.shape[1]), int(w.shape[0])
        bias = f"{oid}.bias" in cls_sd
        layers.append(nn.Linear(in_f, out_f, bias=bias))
        if j < len(lin_ids) - 1:
            layers.append(nn.ReLU(inplace=True))
    head = nn.Sequential(*layers)
    remap: dict[str, torch.Tensor] = {}
    for j, oid in enumerate(lin_ids):
        seq_i = j * 2
        for suf in ("weight", "bias"):
            ok = f"{oid}.{suf}"
            if ok in cls_sd:
                remap[f"{seq_i}.{suf}"] = cls_sd[ok]
    head.load_state_dict(remap, strict=True)
    return head


def _try_load_features_classifier_split(sd0: dict, n_classes: int) -> Optional[nn.Module]:
    """Load checkpoints that store tensors under ``features.*`` and ``classifier.*`` separately."""
    if not any(k.startswith("features.") for k in sd0):
        return None
    if not any(k.startswith("classifier.") for k in sd0):
        return None

    feat_sd = {k[len("features.") :]: v for k, v in sd0.items() if k.startswith("features.")}
    cls_sd = {k[len("classifier.") :]: v for k, v in sd0.items() if k.startswith("classifier.")}

    cls_head = _build_classifier_from_cls_sd(cls_sd)
    if cls_head is None:
        return None

    # First classifier Linear input size must match conv flatten dim (e.g. 256).
    if not isinstance(cls_head[0], nn.Linear):
        return None
    expected_flat = int(cls_head[0].in_features)

    configs = _discover_head_configs(sd0, n_classes)
    if not configs:
        return None

    has_bn = any("running_mean" in k for k in feat_sd)
    use_bn_opts = (True, False) if has_bn else (False,)

    for flat, hidden, n_cls in configs:
        if hidden is None or int(flat) != expected_flat:
            continue
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
                    feat_mod = _build_uniform_conv_tail_only(num_pool, ch, flat, use_bn)
                    try:
                        feat_mod.load_state_dict(feat_sd, strict=True)
                    except Exception:
                        continue
                    net = _FeaturesClassifierNet(feat_mod, cls_head)
                    try:
                        net.load_state_dict(sd0, strict=True)
                    except Exception:
                        continue
                    setattr(net, "_signverse_input_side", int(side))
                    log.info(
                        "Alphabet: loaded features.+classifier. split (pools=%s side=%s ch=%s flat=%s hidden=%s n_cls=%s)",
                        num_pool,
                        side,
                        ch,
                        flat,
                        hidden,
                        n_cls,
                    )
                    return net
    return None


def _try_signverse_custom_sequential_cnn(sd: dict, n_classes: int) -> Optional[nn.Module]:
    """
    Load ``ASLClassifierCNN``-style checkpoints: can be pure FC-only or Conv+FC.
    """
    sd0 = _strip_common_checkpoint_prefix(_strip_dataparallel_state_dict(sd))
    sd0 = {k: v for k, v in sd0.items() if isinstance(v, torch.Tensor)}
    if not sd0:
        return None

    split_net = _try_load_features_classifier_split(sd0, n_classes)
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
    if "config" in loaded and isinstance(loaded.get("config"), dict):
        config = loaded["config"]
        log.info("Found model config in checkpoint: %s", list(config.keys())[:10])
    
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
        mod = _try_signverse_custom_sequential_cnn(td, n_classes)
        if mod is not None:
            return mod
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
    u = letter.upper()
    images: list[str] = []
    letter_dir = os.path.join(DATASET_DIR, u)
    if os.path.isdir(letter_dir):
        for fname in os.listdir(letter_dir):
            if fname.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                images.append(os.path.join(letter_dir, fname))
    if not images and os.path.isdir(REF_IMAGES_DIR):
        for ext in (".jpg", ".jpeg", ".png", ".webp"):
            p = os.path.join(REF_IMAGES_DIR, f"{u}{ext}")
            if os.path.isfile(p):
                images = [p]
                break
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
                
                # Try to extract class_to_idx from checkpoint (most reliable source)
                if "class_to_idx" in raw and isinstance(raw["class_to_idx"], dict):
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
        "ref_images_dir": REF_IMAGES_DIR,
        "ref_images_dir_found": os.path.isdir(REF_IMAGES_DIR),
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

        inferred_side = getattr(alphabet_cls, "_signverse_input_side", None)
        try:
            env_side = int(os.environ.get("ALPHABET_INPUT_SIZE", "0"))
        except ValueError:
            env_side = 0
        side = env_side if env_side > 0 else (inferred_side if inferred_side else 224)
        side = max(64, min(int(side), 640))
        resized = cv2.resize(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB), (side, side))
        tensor = torch.tensor(resized, dtype=torch.float32).permute(2, 0, 1).unsqueeze(0) / 255.0

        # IMPORTANT: Apply ImageNet normalization (required for ResNet18 feature extractor)
        # This is assumed to match training preprocessing
        mean = torch.tensor([0.485, 0.456, 0.406], device=DEVICE).view(1, 3, 1, 1)
        std = torch.tensor([0.229, 0.224, 0.225], device=DEVICE).view(1, 3, 1, 1)
        tensor = tensor.to(DEVICE)
        tensor = (tensor - mean) / std
        
        log.debug("Image preprocessed: shape=%s, mean=%.3f, std=%.3f", 
                 tensor.shape, tensor.mean().item(), tensor.std().item())

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
            detail=(
                f"No images for '{letter}'. Set ASL_ALPHABET_DATASET_DIR to the Kaggle asl_alphabet_train "
                f"tree, or add static/alphabet_refs/{letter}.jpg (override with ASL_ALPHABET_REF_IMAGES_DIR)."
            ),
        )
    chosen = random.choice(images)
    mime, _ = mimetypes.guess_type(chosen)
    return FileResponse(
        chosen,
        media_type=mime or "application/octet-stream",
        headers={"Cache-Control": "no-cache"},
    )


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
            "Learning (integrated) ready | alphabet=%s | kaggle_dataset_dir=%s | bundled_ref_dir=%s",
            alphabet_cls is not None,
            os.path.isdir(DATASET_DIR),
            os.path.isdir(REF_IMAGES_DIR),
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
            "Learning backend (standalone) | alphabet=%s | kaggle_dataset_dir=%s | bundled_ref_dir=%s",
            alphabet_cls is not None,
            os.path.isdir(DATASET_DIR),
            os.path.isdir(REF_IMAGES_DIR),
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
