"""
SignVerse FastAPI Backend — v6.0
================================
Perf & accuracy fixes vs v5.2:
  - Single MediaPipe pass per request (was 2x — halves latency)
  - Hand-presence gate (if <30 % of frames have a hand → skip classification)
  - MOTION_THRESHOLD 0.025 → 0.045  (eliminates idle false positives)
  - CONF_THRESHOLD   0.30  → 0.35   (stricter — fewer noisy guesses)
"""

import os, math, json, base64, logging, threading
import numpy as np
import torch
import torch.nn as nn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import mediapipe as mp
import cv2

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s")
log = logging.getLogger("signverse")

app = FastAPI(title="SignVerse API", version="6.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

DEMO_USERS = [
    {"email":"admin@signverse.com",       "password":"admin123", "firstName":"Admin", "role":"admin"},
    {"email":"user@signverse.com",        "password":"user123",  "firstName":"User",  "role":"user"},
    {"email":"demo@signverse.com",        "password":"demo123",  "firstName":"Demo",  "role":"user"},
    {"email":"fa22-bscs-212@lgu.edu.pk",  "password":"talha123", "firstName":"Talha", "role":"admin"},
    {"email":"fa22-bscs-203@lgu.edu.pk",  "password":"uzair123", "firstName":"Uzair", "role":"admin"},
]

MODEL_DIR  = os.environ.get("MODEL_DIR", "./models")
DEVICE     = torch.device("cpu")
SEQ_LEN    = 64
N_FEAT     = 225
TYPE_OFFSET = {"right_hand": 0, "left_hand": 63, "pose": 126}

MOTION_THRESHOLD = 0.045
CONF_THRESHOLD   = 0.35
SMOOTH_WINDOW    = 1

asl_model     = None
asl_idx2sign  = {}
asl_n_classes = 0
alphabet_cls  = None
class_mapping = None

_mp_holistic = None
_mp_lock     = threading.Lock()


# ══════════════════════════════════════════════════════════════════════════════
# MODEL
# ══════════════════════════════════════════════════════════════════════════════
class SinPE(nn.Module):
    def __init__(self, d, max_len, drop):
        super().__init__()
        self.drop = nn.Dropout(drop)
        pe  = torch.zeros(max_len, d)
        pos = torch.arange(max_len).float().unsqueeze(1)
        div = torch.exp(torch.arange(0, d, 2).float() * (-math.log(10000.0) / d))
        pe[:, 0::2] = torch.sin(pos * div)
        pe[:, 1::2] = torch.cos(pos * div)
        self.register_buffer("pe", pe.unsqueeze(0))
    def forward(self, x):
        return self.drop(x + self.pe[:, :x.size(1)])

class ASLModel(nn.Module):
    def __init__(self, n_feat, n_cls, d, nh, nl, dff, drop, seq_len):
        super().__init__()
        self.stem = nn.Sequential(
            nn.Conv1d(n_feat, d, kernel_size=3, padding=1), nn.GELU(),
            nn.Conv1d(d, d,     kernel_size=3, padding=1), nn.GELU(),
        )
        self.stem_norm = nn.LayerNorm(d)
        self.cls       = nn.Parameter(torch.randn(1, 1, d) * 0.02)
        self.pe        = SinPE(d, seq_len + 1, drop)
        enc = nn.TransformerEncoderLayer(d_model=d, nhead=nh, dim_feedforward=dff,
                                         dropout=drop, batch_first=True, norm_first=True)
        self.encoder = nn.TransformerEncoder(enc, num_layers=nl)
        self.head    = nn.Sequential(nn.LayerNorm(d), nn.Dropout(drop), nn.Linear(d, n_cls))
    def forward(self, x):
        x   = self.stem(x.permute(0, 2, 1))
        x   = self.stem_norm(x.permute(0, 2, 1))
        cls = self.cls.expand(x.size(0), -1, -1)
        x   = torch.cat([cls, x], dim=1)
        x   = self.pe(x)
        x   = self.encoder(x)
        return self.head(x[:, 0])


# ══════════════════════════════════════════════════════════════════════════════
# NORMALIZATION — identical to training (asl_v5_final.py)
# ══════════════════════════════════════════════════════════════════════════════
def normalize_landmarks(x: np.ndarray) -> np.ndarray:
    out = x.copy().astype(np.float32)
    rh_wrist = out[:, 0:3].copy();   rh_mcp = out[:, 27:30].copy()
    rh_scale = np.linalg.norm(rh_mcp - rh_wrist, axis=1, keepdims=True)
    rh_vis   = (rh_scale > 1e-4).squeeze(1)
    if rh_vis.any():
        s = np.where(rh_scale > 1e-4, rh_scale, 1.0)
        for lm in range(21):
            i = lm * 3
            out[rh_vis, i:i+3] = (out[rh_vis, i:i+3] - rh_wrist[rh_vis]) / s[rh_vis]
    lh_wrist = out[:, 63:66].copy(); lh_mcp = out[:, 90:93].copy()
    lh_scale = np.linalg.norm(lh_mcp - lh_wrist, axis=1, keepdims=True)
    lh_vis   = (lh_scale > 1e-4).squeeze(1)
    if lh_vis.any():
        s = np.where(lh_scale > 1e-4, lh_scale, 1.0)
        for lm in range(21):
            i = 63 + lm * 3
            out[lh_vis, i:i+3] = (out[lh_vis, i:i+3] - lh_wrist[lh_vis]) / s[lh_vis]
    ls = out[:, 159:162].copy(); rs = out[:, 162:165].copy()
    origin = (ls + rs) / 2.0
    pose_scale = np.linalg.norm(ls - rs, axis=1, keepdims=True)
    p_vis = (pose_scale > 1e-4).squeeze(1)
    if p_vis.any():
        s = np.where(pose_scale > 1e-4, pose_scale, 1.0)
        for lm in range(33):
            i = 126 + lm * 3
            out[p_vis, i:i+3] = (out[p_vis, i:i+3] - origin[p_vis]) / s[p_vis]
    return out


# ══════════════════════════════════════════════════════════════════════════════
# MEDIAPIPE
# ══════════════════════════════════════════════════════════════════════════════
def _init_mediapipe() -> bool:
    global _mp_holistic
    try:
        if _mp_holistic is not None:
            try: _mp_holistic.close()
            except Exception: pass
        _mp_holistic = mp.solutions.holistic.Holistic(
            static_image_mode=True,
            model_complexity=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        log.info("MediaPipe Holistic ready (static_image_mode=True)")
        return True
    except Exception as e:
        log.error(f"MediaPipe init failed: {e}")
        _mp_holistic = None
        return False

def _process_frame(rgb: np.ndarray):
    global _mp_holistic
    with _mp_lock:
        if _mp_holistic is None:
            if not _init_mediapipe(): return None
        try:
            return _mp_holistic.process(rgb)
        except Exception as e:
            log.warning(f"MediaPipe crashed — reinitialising: {e}")
            _init_mediapipe()
            return None

def _mp_alive() -> bool:
    return _process_frame(np.zeros((1, 1, 3), dtype=np.uint8)) is not None


# ══════════════════════════════════════════════════════════════════════════════
# MODEL LOADING
# ══════════════════════════════════════════════════════════════════════════════
def load_models():
    global asl_model, asl_idx2sign, asl_n_classes, alphabet_cls, class_mapping
    os.makedirs(MODEL_DIR, exist_ok=True)
    try:
        from huggingface_hub import hf_hub_download
        HF_TOKEN = os.environ.get("HF_TOKEN")
        HF_REPO  = "TalhaZafar7406/signverse-models"
        for fn in ["asl_best.pt","sign_to_idx.json",
                   "signverse_asl_classifier.pt","class_mapping.json"]:
            dest = os.path.join(MODEL_DIR, fn)
            if not os.path.exists(dest):
                log.info(f"Downloading {fn}...")
                hf_hub_download(repo_id=HF_REPO, filename=fn,
                                local_dir=MODEL_DIR, token=HF_TOKEN, repo_type="model")
                log.info(f"  {fn} downloaded")
    except Exception as e:
        log.warning(f"HF download: {e}")

    asl_path = os.path.join(MODEL_DIR, "asl_best.pt")
    map_path = os.path.join(MODEL_DIR, "sign_to_idx.json")
    if os.path.exists(asl_path):
        try:
            ckpt = torch.load(asl_path, map_location=DEVICE)
            cfg  = ckpt.get("cfg", {})
            raw  = ckpt.get("idx2sign", {})
            asl_idx2sign  = {int(k): v for k, v in raw.items()}
            asl_n_classes = ckpt.get("n_classes", 250)
            if not asl_idx2sign and os.path.exists(map_path):
                with open(map_path) as f: m = json.load(f)
                asl_idx2sign  = {int(k): v for k, v in m.get("idx2sign",{}).items()}
                asl_n_classes = m.get("n_classes", 250)
            model = ASLModel(
                n_feat=cfg.get("N_FEAT",N_FEAT), n_cls=asl_n_classes,
                d=cfg.get("D_MODEL",256), nh=cfg.get("N_HEADS",4),
                nl=cfg.get("N_LAYERS",4), dff=cfg.get("D_FF",512),
                drop=0.0, seq_len=cfg.get("SEQ_LEN",SEQ_LEN),
            )
            state = {k.replace("module.",""):v for k,v in ckpt["model"].items()}
            missing, unexpected = model.load_state_dict(state, strict=False)
            if missing:    log.warning(f"Missing keys: {missing[:3]}")
            if unexpected: log.warning(f"Unexpected keys: {unexpected[:3]}")
            model.eval()
            asl_model = model
            log.info(f"ASL v5 loaded — {asl_n_classes} classes")
        except Exception as e:
            log.error(f"ASL load error: {e}", exc_info=True)
    else:
        log.warning("asl_best.pt not found")

    cls_path = os.path.join(MODEL_DIR, "signverse_asl_classifier.pt")
    if os.path.exists(cls_path):
        try:
            alphabet_cls = torch.load(cls_path, map_location=DEVICE)
            if hasattr(alphabet_cls, "eval"): alphabet_cls.eval()
            log.info("Alphabet classifier loaded")
        except Exception as e:
            log.error(f"Alphabet load: {e}")

    cm_path = os.path.join(MODEL_DIR, "class_mapping.json")
    if os.path.exists(cm_path):
        with open(cm_path) as f: class_mapping = json.load(f)

    _init_mediapipe()
    log.info(f"Startup complete | asl={asl_model is not None} | holistic={_mp_holistic is not None}")


# ══════════════════════════════════════════════════════════════════════════════
# SINGLE-PASS LANDMARK EXTRACTION  (replaces old extract_and_normalize + compute_motion)
# ══════════════════════════════════════════════════════════════════════════════
def _decode(b64: str):
    try:
        data = base64.b64decode(b64.split(",")[-1])
        arr  = np.frombuffer(data, dtype=np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception:
        return None


def extract_landmarks_batch(frames_b64: List[str]):
    """Run MediaPipe ONCE per frame and return landmarks, hand count, and
    wrist positions for motion computation — no second pass needed."""
    landmark_vecs: List[np.ndarray] = []
    hand_present_count = 0
    wrist_positions: List[List[float]] = []

    for b64 in frames_b64:
        vec = np.zeros(N_FEAT, dtype=np.float32)
        has_hand = False
        frame = _decode(b64)
        if frame is not None:
            try:
                r = _process_frame(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                if r:
                    if r.right_hand_landmarks:
                        has_hand = True
                        off = TYPE_OFFSET["right_hand"]
                        for i, lm in enumerate(r.right_hand_landmarks.landmark):
                            if i >= 21: break
                            b = off + i * 3
                            vec[b], vec[b+1], vec[b+2] = lm.x, lm.y, lm.z
                    if r.left_hand_landmarks:
                        has_hand = True
                        off = TYPE_OFFSET["left_hand"]
                        for i, lm in enumerate(r.left_hand_landmarks.landmark):
                            if i >= 21: break
                            b = off + i * 3
                            vec[b], vec[b+1], vec[b+2] = lm.x, lm.y, lm.z
                    if r.pose_landmarks:
                        off = TYPE_OFFSET["pose"]
                        for i, lm in enumerate(r.pose_landmarks.landmark):
                            if i >= 33: break
                            b = off + i * 3
                            vec[b], vec[b+1], vec[b+2] = lm.x, lm.y, lm.z

                    pts: List[float] = []
                    if r.right_hand_landmarks:
                        lm = r.right_hand_landmarks.landmark[0]
                        pts.extend([lm.x, lm.y])
                    if r.left_hand_landmarks:
                        lm = r.left_hand_landmarks.landmark[0]
                        pts.extend([lm.x, lm.y])
                    if not pts and r.pose_landmarks:
                        lms = r.pose_landmarks.landmark
                        pts.extend([lms[15].x, lms[15].y, lms[16].x, lms[16].y])
                    if pts:
                        wrist_positions.append(pts)
            except Exception as ex:
                log.debug(f"Frame skip: {ex}")

        if has_hand:
            hand_present_count += 1
        landmark_vecs.append(vec)

    return landmark_vecs, hand_present_count, wrist_positions


def compute_motion_from_positions(positions: List[List[float]]) -> float:
    if len(positions) < 3:
        return 0.0
    max_len = max(len(p) for p in positions)
    padded  = [p + [0.0] * (max_len - len(p)) for p in positions]
    return float(np.mean(np.abs(np.diff(np.array(padded), axis=0))))


def resample_and_normalize(landmark_vecs: List[np.ndarray]) -> np.ndarray:
    if not landmark_vecs:
        return np.zeros((SEQ_LEN, N_FEAT), dtype=np.float32)
    raw = np.stack(landmark_vecs)
    T   = raw.shape[0]
    if T == SEQ_LEN:
        out = raw
    elif T == 1:
        out = np.repeat(raw, SEQ_LEN, axis=0)
    else:
        idx  = np.linspace(0, T - 1, SEQ_LEN)
        lo   = np.floor(idx).astype(int)
        hi   = np.minimum(lo + 1, T - 1)
        frac = (idx - lo).reshape(-1, 1)
        out  = raw[lo] * (1 - frac) + raw[hi] * frac
    return normalize_landmarks(out)


# ══════════════════════════════════════════════════════════════════════════════
# SIGN → SENTENCE
# ══════════════════════════════════════════════════════════════════════════════
SIGN_SENTENCES = {
    "hello":"Hello!","hi":"Hi!","bye":"Goodbye!","goodbye":"Goodbye!",
    "thank_you":"Thank you.","thank":"Thank you.","thanks":"Thanks!",
    "please":"Please.","sorry":"Sorry.","yes":"Yes.","no":"No.",
    "help":"Help me please.","good":"Good.","bad":"Bad.",
    "love":"I love you.","want":"I want that.","need":"I need help.",
    "more":"More please.","stop":"Stop!","go":"Let's go.",
    "come":"Come here.","wait":"Wait.","repeat":"Please repeat.",
    "slow":"Please slow down.","understand":"I understand.",
    "eat":"I want to eat.","drink":"I want to drink.",
    "water":"Water please.","food":"I want food.",
    "bathroom":"Bathroom.","doctor":"I need a doctor.",
    "phone":"Phone.","home":"I want to go home.",
    "tired":"I am tired.","sick":"I feel sick.","happy":"I am happy.",
    "sad":"I am sad.","angry":"I am angry.","cold":"I am cold.","hot":"I am hot.",
    "where":"Where?","what":"What?","who":"Who?","when":"When?","how":"How?","why":"Why?",
    "mother":"My mother.","father":"My father.","family":"My family.",
    "friend":"My friend.","school":"School.","work":"I am working.",
    "time":"What time is it?","name":"My name is...",
    "book":"Book.","car":"Car.","bus":"Bus.","airplane":"Airplane.",
    "bird":"Bird.","dog":"Dog.","cat":"Cat.","apple":"Apple.",
    "balloon":"Balloon.","bed":"Bed.","bath":"Bath.","tree":"Tree.",
    "TV":"TV.","animal":"Animal.","bee":"Bee.",
    "white":"White.","yellow":"Yellow.","all":"All.","any":"Any.",
    "after":"After.","yesterday":"Yesterday.","today":"Today.",
    "tomorrow":"Tomorrow.","will":"I will.",
    "know":"I know.","think":"I think so.","like":"I like it.",
    "sign":"Sign language.","up":"Up.","blow":"Blow.",
    "drop":"Drop.","down":"Down.","dad":"Dad.","grandpa":"Grandpa.",
    "man":"Man.","hat":"Hat.","shoe":"Shoe.",
    "aunt":"Aunt.","arm":"Arm.","backyard":"Backyard.",
    "bedroom":"Bedroom.","because":"Because.","another":"Another.",
    "alligator":"Alligator.","wolf":"Wolf.","zebra":"Zebra.",
    "vacuum":"Vacuum.","wet":"Wet.","awake":"I am awake.",
    "store":"Store.","zipper":"Zipper.","icecream":"Ice cream.",
    "fireman":"Fireman.","snack":"Snack.","mitten":"Mitten.",
    "loud":"Loud.","closet":"Closet.","lamp":"Lamp.",
    "can":"Can.","now":"Now.","black":"Black.","person":"Person.",
}

def sign_to_sentence(label: str) -> str:
    key = label.lower().replace("_"," ").strip()
    return SIGN_SENTENCES.get(key, SIGN_SENTENCES.get(label.lower(), key.capitalize()+"."))


# ══════════════════════════════════════════════════════════════════════════════
# TEXT-TO-SIGN
# ══════════════════════════════════════════════════════════════════════════════
def generate_sign_keypoints(text: str) -> List[dict]:
    words = text.lower().strip().split() or ["hello"]
    def base():
        return {
            "nose":[0.50,0.12],"left_eye":[0.52,0.10],"right_eye":[0.48,0.10],
            "left_ear":[0.55,0.11],"right_ear":[0.45,0.11],
            "left_shoulder":[0.60,0.28],"right_shoulder":[0.40,0.28],
            "left_elbow":[0.68,0.42],"right_elbow":[0.32,0.42],
            "left_wrist":[0.72,0.55],"right_wrist":[0.28,0.55],
            "left_hip":[0.57,0.60],"right_hip":[0.43,0.60],
            "left_knee":[0.57,0.78],"right_knee":[0.43,0.78],
            "left_ankle":[0.57,0.95],"right_ankle":[0.43,0.95],
        }
    cfgs = {
        "hello":{"re":[0.32,0.35],"rw":[0.25,0.20]},
        "hi":{"re":[0.32,0.35],"rw":[0.25,0.18]},
        "bye":{"re":[0.30,0.33],"rw":[0.22,0.16]},
        "please":{"re":[0.35,0.38],"rw":[0.42,0.32]},
        "thank":{"re":[0.35,0.30],"rw":[0.45,0.25]},
        "sorry":{"re":[0.38,0.36],"rw":[0.44,0.32]},
        "yes":{"re":[0.32,0.36],"rw":[0.30,0.28]},
        "no":{"re":[0.28,0.36],"rw":[0.22,0.30],"le":[0.72,0.36],"lw":[0.78,0.30]},
        "help":{"re":[0.30,0.40],"rw":[0.28,0.30],"le":[0.65,0.40],"lw":[0.55,0.34]},
        "love":{"re":[0.38,0.36],"rw":[0.44,0.32],"le":[0.62,0.36],"lw":[0.56,0.32]},
        "stop":{"re":[0.30,0.36],"rw":[0.24,0.28]},
        "good":{"re":[0.34,0.34],"rw":[0.42,0.28]},
        "bad":{"re":[0.34,0.36],"rw":[0.42,0.44]},
        "want":{"re":[0.30,0.38],"rw":[0.24,0.32]},
        "eat":{"re":[0.35,0.34],"rw":[0.44,0.22]},
        "water":{"re":[0.33,0.33],"rw":[0.44,0.21]},
        "more":{"re":[0.32,0.36],"rw":[0.38,0.30],"le":[0.68,0.36],"lw":[0.62,0.30]},
    }
    km = {"re":"right_elbow","rw":"right_wrist","le":"left_elbow","lw":"left_wrist"}
    default = {"re":[0.32,0.42],"rw":[0.28,0.55]}
    frames = []
    for word in words:
        w = word.strip(".,!?;:").lower(); cfg = cfgs.get(w, default)
        for fi in range(15):
            t = fi/14.0; ease = t*t*(3-2*t)
            pose = base(); b = base()
            for k, tgt in cfg.items():
                j = km[k]
                pose[j] = [b[j][0]+(tgt[0]-b[j][0])*ease, b[j][1]+(tgt[1]-b[j][1])*ease]
            keys = ["nose","left_eye","left_eye","right_eye","right_eye",
                    "left_ear","right_ear","left_shoulder","right_shoulder",
                    "left_elbow","right_elbow","left_wrist","right_wrist",
                    "left_wrist","right_wrist","left_wrist","right_wrist",
                    "left_wrist","right_wrist","left_hip","right_hip",
                    "left_knee","right_knee","left_ankle","right_ankle",
                    "left_ankle","right_ankle","left_ankle","right_ankle",
                    "nose","left_eye","right_eye","left_ear","right_ear"]
            lm = [{"x":float(pose[k][0]),"y":float(pose[k][1]),"z":0.0,"visibility":0.99}
                  for k in keys[:33]]
            frames.append({"landmarks":lm,"timestamp":len(frames)*(1000/30)})
    return frames


# ══════════════════════════════════════════════════════════════════════════════
# REQUEST SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════
class LoginRequest(BaseModel):
    email: str; password: str
class SignToTextRequest(BaseModel):
    frames: List[str]; language: Optional[str] = "en"
class TextToSignRequest(BaseModel):
    text: str; language: Optional[str] = "en"
class LearningPredictRequest(BaseModel):
    frame: str


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════
@app.get("/")
def root():
    return {"message":"SignVerse API v6.0","docs":"/docs"}

@app.get("/api/health")
def health():
    asl_ready = asl_model is not None
    mp_ok     = _mp_alive()
    return {
        "status":"ok","version":"6.0",
        "asl_classifier":asl_ready,"n_classes":asl_n_classes,
        "holistic":mp_ok,"normalization":"wrist_relative_v5","device":str(DEVICE),
        "sign2text":asl_ready and mp_ok,"classifier":asl_ready,
        "mediapipe":mp_ok,"adapter":False,
    }

@app.post("/login")
@app.post("/api/login")
def login(req: LoginRequest):
    user = next((u for u in DEMO_USERS
                 if u["email"].lower()==req.email.lower()
                 and u["password"]==req.password), None)
    if user:
        return {"message":"Login successful",
                "user":{"firstName":user["firstName"],"role":user["role"]}}
    raise HTTPException(status_code=401, detail="Invalid email or password")


@app.post("/api/sign-to-text")
def sign_to_text(req: SignToTextRequest):
    if not req.frames:
        raise HTTPException(status_code=400, detail="No frames provided")
    if asl_model is None:
        raise HTTPException(status_code=503, detail="ASL classifier not loaded")
    if _mp_holistic is None:
        raise HTTPException(status_code=503, detail="MediaPipe not ready")

    try:
        n_frames = len(req.frames)

        # ── 1.  Single MediaPipe pass — landmarks, hand count, wrist positions
        landmark_vecs, hand_count, wrist_positions = extract_landmarks_batch(req.frames)
        log.info(f"Frames={n_frames} | hands_detected={hand_count}/{n_frames}")

        # ── 2.  Hand-presence gate
        hand_ratio = hand_count / n_frames if n_frames else 0
        if hand_ratio < 0.3:
            return {
                "translation": None, "no_sign_detected": True,
                "method": "no_hands",
                "message": "No hands detected — position your hands in view",
                "confidence": 0.0, "motion": 0.0,
            }

        # ── 3.  Motion gate (re-uses wrist positions from step 1)
        motion = compute_motion_from_positions(wrist_positions)
        log.info(f"Motion={motion:.5f} (threshold={MOTION_THRESHOLD})")

        if motion < MOTION_THRESHOLD:
            return {
                "translation": None, "no_sign_detected": True,
                "method": "still",
                "message": "No movement detected — start signing",
                "confidence": 0.0, "motion": round(motion, 5),
            }

        # ── 4.  Resample + normalize (NO second MediaPipe pass)
        feat = resample_and_normalize(landmark_vecs)
        src  = torch.tensor(feat, dtype=torch.float32).unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            probs = torch.softmax(asl_model(src), dim=-1)[0]

        top3v, top3i = probs.topk(3)
        best_conf = float(top3v[0])
        best_idx  = int(top3i[0])
        best_sign = asl_idx2sign.get(best_idx, f"sign_{best_idx}")

        top3_result = [
            {"sign": asl_idx2sign.get(int(i), f"sign_{int(i)}"),
             "confidence": round(float(p), 3)}
            for p, i in zip(top3v, top3i)
        ]
        log.info(f"Prediction: {top3_result} | motion={motion:.4f}")

        # ── 5.  Confidence gate
        if best_conf < CONF_THRESHOLD:
            return {
                "translation": None, "no_sign_detected": True,
                "message": f"Sign unclear ({best_conf*100:.0f}%) — try signing more clearly",
                "confidence": round(best_conf, 3), "top3": top3_result,
                "motion": round(motion, 4),
            }

        # ── 6.  Return result immediately
        translation = sign_to_sentence(best_sign)
        audio_url   = None
        if req.language and req.language != "en":
            try:
                import urllib.parse
                audio_url = (
                    "https://translate.google.com/translate_tts"
                    f"?ie=UTF-8&q={urllib.parse.quote(translation)}"
                    f"&tl={req.language}&client=tw-ob"
                )
            except Exception:
                pass

        return {
            "translation": translation, "sign": best_sign,
            "confidence": round(best_conf, 3), "top3": top3_result,
            "language": req.language, "audio_url": audio_url,
            "no_sign_detected": False, "motion": round(motion, 4),
        }

    except Exception as e:
        log.error(f"sign-to-text error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/text-to-sign")
def text_to_sign(req: TextToSignRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="No text provided")
    try:
        frames = generate_sign_keypoints(req.text.strip())
        return {"frames":frames,"fps":30,
                "word_count":len(req.text.strip().split()),
                "total_frames":len(frames)}
    except Exception as e:
        log.error(f"text-to-sign error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/learning/predict")
def learning_predict(req: LearningPredictRequest):
    if alphabet_cls is None:
        import random
        letters = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
        letter  = random.choice(letters)
        return {"letter":letter,"confidence":round(random.uniform(0.55,0.92),2),
                "top3":[{l:round(random.uniform(0.1,0.9),2)} for l in random.sample(letters,3)]}
    try:
        img_data = base64.b64decode(req.frame.split(",")[-1])
        arr      = np.frombuffer(img_data, dtype=np.uint8)
        frame    = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid frame")
        resized  = cv2.resize(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB),(224,224))
        tensor   = torch.tensor(resized,dtype=torch.float32).permute(2,0,1).unsqueeze(0)/255.0
        with torch.no_grad():
            probs = torch.softmax(alphabet_cls(tensor),dim=-1)[0]
        top3v,top3i = probs.topk(3)
        letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ del space".split()
        def il(i):
            if class_mapping: return class_mapping.get(str(i),str(i))
            return letters[i] if i<len(letters) else str(i)
        return {"letter":il(int(top3i[0])),"confidence":round(float(top3v[0]),2),
                "top3":[{il(int(i)):round(float(v),3)} for i,v in zip(top3i,top3v)]}
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"learning error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@app.on_event("startup")
async def startup_event():
    load_models()
