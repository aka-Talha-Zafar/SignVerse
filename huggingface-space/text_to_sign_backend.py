"""
Text-to-sign: English → ASL gloss → keyframe sequences from database.json.

Integrated into the main Space app via integrate_text_to_sign_into_signverse(app),
same pattern as learning_backend.
"""

from __future__ import annotations

import json
import logging
import os
import re
import threading
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, FastAPI, HTTPException
from pydantic import BaseModel

log = logging.getLogger("signverse")

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_DEFAULT_DB = os.path.join(_BASE_DIR, "database.json")

WORDS_DB: Optional[Dict[str, Any]] = None
_DB_LOCK = threading.Lock()
_LOAD_ERROR: Optional[str] = None

AUX = {
    "is",
    "are",
    "was",
    "were",
    "am",
    "be",
    "do",
    "does",
    "did",
    "has",
    "have",
    "will",
    "can",
}


def _db_path() -> str:
    return os.environ.get("TEXT_TO_SIGN_DATABASE", _DEFAULT_DB)


def _ensure_writable_scratch() -> None:
    """Hub clients + tempfile must write somewhere owned by the Space user (fixes /home/tmp_* errors)."""
    for d in (
        os.path.join(_BASE_DIR, "tmp"),
        os.path.join(_BASE_DIR, ".hf_hub_cache"),
    ):
        try:
            os.makedirs(d, mode=0o755, exist_ok=True)
        except OSError:
            pass
    # Force temp dir under the app tree (Dockerfile TMPDIR is /home/user/tmp but some libs ignore it).
    os.environ.setdefault("TMPDIR", os.path.join(_BASE_DIR, "tmp"))
    os.environ.setdefault("HF_HUB_CACHE", os.path.join(_BASE_DIR, ".hf_hub_cache"))


def _hub_resolve_url(repo_id: str, repo_type: str, filename: str, revision: str) -> str:
    """Public CDN URL for a file on the Hub (no ranged GET — avoids Xet 416 with hf_transfer)."""
    fn = filename.lstrip("/")
    rev = revision.strip() or "main"
    if repo_type == "space":
        return f"https://huggingface.co/spaces/{repo_id}/resolve/{rev}/{fn}"
    if repo_type == "dataset":
        return f"https://huggingface.co/datasets/{repo_id}/resolve/{rev}/{fn}"
    if repo_type == "model":
        return f"https://huggingface.co/{repo_id}/resolve/{rev}/{fn}"
    raise ValueError(f"unsupported repo_type: {repo_type}")


def _http_download_hub_file(url: str, dest_path: str) -> bool:
    """Stream download without Range header (works for large Xet-backed files where hf_hub returns 416)."""
    import ssl
    import urllib.error
    import urllib.request

    _ensure_writable_scratch()
    parent = os.path.dirname(os.path.abspath(dest_path))
    if parent:
        os.makedirs(parent, exist_ok=True)
    partial = dest_path + ".part"
    if os.path.isfile(partial):
        try:
            os.unlink(partial)
        except OSError:
            pass

    headers = {
        "User-Agent": "SignVerse-TextToSign/1.0 (urllib; full GET, no Range)",
        "Accept": "*/*",
    }
    tok = (os.environ.get("HF_TOKEN") or "").strip()
    if tok:
        headers["Authorization"] = f"Bearer {tok}"

    req = urllib.request.Request(url, headers=headers)
    ctx = ssl.create_default_context()
    # Large JSON: long timeout; single GET avoids 416 Range Not Satisfiable on xethub.
    timeout_s = int(os.environ.get("TEXT_TO_SIGN_DOWNLOAD_TIMEOUT", "7200"))

    try:
        log.info("text-to-sign: HTTP GET (full file) %s", url[:120] + ("…" if len(url) > 120 else ""))
        with urllib.request.urlopen(req, timeout=timeout_s, context=ctx) as resp:
            code = getattr(resp, "status", None) or resp.getcode()
            if code != 200:
                log.warning("text-to-sign: unexpected HTTP status %s", code)
                return False
            total = 0
            last_log = 0
            chunk_sz = 8 * 1024 * 1024
            log_every = 64 * 1024 * 1024
            with open(partial, "wb") as out:
                while True:
                    chunk = resp.read(chunk_sz)
                    if not chunk:
                        break
                    out.write(chunk)
                    total += len(chunk)
                    if total - last_log >= log_every:
                        log.info("text-to-sign: … %.0f MB received", total / (1024 * 1024))
                        last_log = total
        if total == 0:
            log.warning("text-to-sign: HTTP download wrote 0 bytes")
            try:
                os.unlink(partial)
            except OSError:
                pass
            return False
        os.replace(partial, dest_path)
        log.info("text-to-sign: HTTP download complete (%.1f MB)", total / (1024 * 1024))
        return True
    except urllib.error.HTTPError as e:
        log.warning("text-to-sign: HTTP error %s: %s", e.code, e.reason)
        try:
            os.unlink(partial)
        except OSError:
            pass
        return False
    except Exception as e:
        log.warning("text-to-sign: HTTP download failed: %s", e)
        try:
            os.unlink(partial)
        except OSError:
            pass
        return False


def _hub_download_db(repo_id: str, repo_type: str, filename: str) -> Optional[str]:
    """Download a single file from a Hub repo into _BASE_DIR; return local path or None."""
    _ensure_writable_scratch()
    rev = (os.environ.get("TEXT_TO_SIGN_HF_REVISION") or "main").strip() or "main"
    dest = os.path.join(_BASE_DIR, os.path.basename(filename))
    url = _hub_resolve_url(repo_id, repo_type, filename, rev)

    if _http_download_hub_file(url, dest):
        return dest if os.path.isfile(dest) else None

    # Fallback: huggingface_hub (can hit Xet + Range 416 on very large files)
    try:
        from huggingface_hub import hf_hub_download

        token = os.environ.get("HF_TOKEN")
        log.info(
            "text-to-sign: hf_hub_download fallback %s from %s (repo_type=%s) …",
            filename,
            repo_id,
            repo_type,
        )
        p = hf_hub_download(
            repo_id=repo_id,
            filename=filename,
            repo_type=repo_type,
            local_dir=_BASE_DIR,
            token=token,
        )
        return p if os.path.isfile(p) else None
    except Exception as e:
        log.warning("text-to-sign: hf_hub_download failed (%s/%s): %s", repo_id, filename, e)
        return None


def _resolve_database_path() -> Optional[str]:
    """Return path to database.json: local file, explicit Hub repo, or this Space's repo.

    Docker images only contain files listed in the Dockerfile ``COPY`` lines. If
    ``database.json`` lives in the Space git repo but is not copied into the image,
    Hugging Face still exposes ``SPACE_ID`` at runtime — we fetch the file from the
    Hub (``repo_type=space``) into ``_BASE_DIR`` and load it from disk.
    """
    path = _db_path()
    if os.path.isfile(path):
        return path

    fn = os.environ.get("TEXT_TO_SIGN_HF_FILENAME", "database.json").strip() or "database.json"

    repo = (os.environ.get("TEXT_TO_SIGN_HF_REPO") or "").strip()
    if repo:
        rtype = (os.environ.get("TEXT_TO_SIGN_HF_REPO_TYPE") or "dataset").strip()
        p = _hub_download_db(repo, rtype, fn)
        if p:
            return p

    # Same Space as this app (HF sets SPACE_ID, e.g. "user/signverse-api")
    space_id = (os.environ.get("SPACE_ID") or "").strip()
    if space_id:
        p = _hub_download_db(space_id, "space", fn)
        if p:
            return p

    return None


def load_words_database() -> None:
    """Load JSON gloss→animation map into memory (call once at startup)."""
    global WORDS_DB, _LOAD_ERROR
    with _DB_LOCK:
        # Succeeded earlier — skip. Failed earlier (_LOAD_ERROR set) — retry.
        if WORDS_DB is not None and _LOAD_ERROR is None:
            return
        _LOAD_ERROR = None
        path = _resolve_database_path()
        if not path or not os.path.isfile(path):
            _LOAD_ERROR = f"database file not found (set TEXT_TO_SIGN_DATABASE or TEXT_TO_SIGN_HF_REPO): {_db_path()}"
            log.warning("text-to-sign: %s", _LOAD_ERROR)
            WORDS_DB = {}
            return
        try:
            log.info("text-to-sign: loading database from %s …", path)
            with open(path, "r", encoding="utf-8") as f:
                WORDS_DB = json.load(f)
            log.info(
                "text-to-sign: loaded %s gloss entries",
                len(WORDS_DB) if isinstance(WORDS_DB, dict) else "?",
            )
        except Exception as e:
            _LOAD_ERROR = str(e)
            log.error("text-to-sign: failed to load database: %s", e, exc_info=True)
            WORDS_DB = {}


def to_asl(s: str) -> str:
    if not s:
        return ""
    s = s.strip().lower().replace("don't", "do not").replace("doesn't", "does not")
    t = re.findall(r"[a-z]+", s)
    t = [
        x
        for x in t
        if x != "not"
        and x not in ["a", "an", "the", "to", "of", "in", "at", "on", "for", "with", "by", "from"]
    ]
    if not t:
        return ""

    if t[0] in ["what", "where", "when", "who", "why", "how"]:
        t = [t[0]] + [x for x in t[1:] if x not in AUX]
    else:
        t = [x for x in t if x not in AUX]

    tm = [x for x in t if x in ["yesterday", "today", "tomorrow", "now"]]
    t = tm + [x for x in t if x not in ["yesterday", "today", "tomorrow", "now"]]

    if "not" in s:
        t.append("not")
    return " ".join(t).upper()


def is_missing(pt: List[float]) -> bool:
    return abs(pt[0]) < 0.001 and abs(pt[1]) < 0.001


def build_anim(tokens: List[str], words_db: Dict[str, Any]) -> Optional[List[Any]]:
    seq: List[Any] = []
    tf = 5
    clips: List[Any] = []

    for tok in tokens:
        real_key = next((k for k in words_db.keys() if k.strip().upper() == tok), None)
        if real_key:
            clips.append(words_db[real_key])

    if not clips:
        return None

    for f in clips[0]:
        seq.append(f)

    for i in range(1, len(clips)):
        c1 = clips[i - 1][-1]
        c2 = clips[i][0]

        for t in range(1, tf + 1):
            a = t / (tf + 1)
            x = 2 * a * a if a < 0.5 else 1 - pow(-2 * a + 2, 2) / 2
            trans_frame: List[List[float]] = []

            for kp in range(75):
                if is_missing(c1[kp]) or is_missing(c2[kp]):
                    trans_frame.append([0.0, 0.0])
                else:
                    trans_frame.append(
                        [
                            c1[kp][0] * (1 - x) + c2[kp][0] * x,
                            c1[kp][1] * (1 - x) + c2[kp][1] * x,
                        ]
                    )
            seq.append(trans_frame)

        for f in clips[i]:
            seq.append(f)

    return seq


def translate_text_to_sign_payload(text: str) -> Dict[str, Any]:
    """Return dict with gloss, frames, fps for the frontend."""
    global WORDS_DB
    # Always refresh: startup may have failed before SPACE_ID/network was ready; user may fix env.
    load_words_database()
    assert WORDS_DB is not None
    if not WORDS_DB:
        raise HTTPException(
            status_code=503,
            detail=(
                "Text-to-sign database is not available. "
                f"({_LOAD_ERROR or 'empty WORDS_DB'})"
            ),
        )

    gloss = to_asl(text)
    tokens = [x for x in gloss.split(" ") if x]
    sequence = build_anim(tokens, WORDS_DB)

    if not sequence:
        raise HTTPException(
            status_code=404,
            detail=f"No animation data in vocabulary for this input (gloss: {gloss or '(empty)'}).",
        )

    return {"gloss": gloss, "frames": sequence, "fps": 20}


class TextToSignRequest(BaseModel):
    text: str


text_to_sign_router = APIRouter(tags=["text-to-sign"])


@text_to_sign_router.post("/api/text-to-sign")
def text_to_sign_endpoint(req: TextToSignRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    return translate_text_to_sign_payload(req.text.strip())


def _remove_route_by_path_and_method(main_app: FastAPI, path: str, method: str) -> int:
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


def integrate_text_to_sign_into_signverse(main_app: FastAPI) -> None:
    """
    Drop app.py's placeholder POST /api/text-to-sign, attach this router, prefetch DB in background.

    Large ``database.json`` may be pulled from the Hub (``SPACE_ID``); doing that synchronously on
    startup can exceed Space health checks, so we load in a thread and still load on first request
    if the background job has not finished yet.
    """
    dropped = _remove_route_by_path_and_method(main_app, "/api/text-to-sign", "POST")
    log.info(
        "integrate_text_to_sign_into_signverse: removed %s prior route(s) for POST /api/text-to-sign",
        dropped,
    )
    main_app.include_router(text_to_sign_router)

    @main_app.on_event("startup")
    async def _text_to_sign_startup():
        import asyncio

        async def _bg_load() -> None:
            await asyncio.to_thread(load_words_database)
            log.info("Text-to-sign (integrated) prefetch done | database_loaded=%s", bool(WORDS_DB))

        asyncio.create_task(_bg_load())
        log.info("Text-to-sign (integrated) prefetch scheduled (database may load from Hub)")
