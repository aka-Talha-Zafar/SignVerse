# Software Requirements Specification (As-Built)

## For

**SignVerse**

## BSCS

## By

| S# | Name           | Registration # / Roll # / Section | Mobile #     | E-Mail                      |
|----|----------------|-----------------------------------|--------------|-----------------------------|
| 1  | Uzair Moazzam  | Fa-22/BSCS/203                    | 0301-9465045 | fa22-bscs-203@lgu.edu.pk    |
| 2  | Talha Zafar    | Fa-22/BSCS/212                    | 0302-0465032 | fa22-bscs-212@lgu.edu.pk    |

**Supervised by:** M. Mugees Asif

**Department of Computer Science**  
**Lahore Garrison University, Lahore**

---

**Document status:** This specification describes the **implemented** SignVerse system as it exists in the repository and deployed API (FastAPI on Hugging Face Spaces, Vite/React frontend). It tracks the **revised** baseline SRS (`SRS-SignVerse.md`, April 2026), which now distinguishes **offline training** (`Codes_for_training.txt`) from **inference**, and maps requirements to the **as-built** stack. A high-level structure diagram is **omitted** here by request; it may be redrawn to match this document.

**Revision note (vs original SRS):** Where the original document assumed 3D CNN/Transformers for recognition, BERT for gloss-to-English, PoseFormer for text-to-sign, WebSockets for video streaming, Node.js for primary backend orchestration, and optional live MediaPipe overlays on the sign-to-text page, the as-built system differs as detailed in Sections 2.1–4 and summarized inline below. **April 2026:** Training stacks and datasets are cross-referenced to **`Codes_for_training.txt`** (How2Sign Holistic + BERT EncoderDecoder + PoseFormer/BoneTransformer for text-to-sign authoring; Google **ASL Signs** Kaggle parquet pipeline for the **v5** landmark classifier).

---

## Table of Contents

1. Introduction  
2. Overall Description  
3. External Interface Requirements  
4. System Features  
5. Other Nonfunctional Requirements  
References  

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (As-Built) documents the **functional and nonfunctional** behavior of **SignVerse** after implementation: a web-based bidirectional American Sign Language (ASL) translation and learning platform. It serves the same roles as the original SRS—development traceability, testing, and maintenance—except it is **aligned with the current codebase** rather than the initial technology plan.

### 1.2 Document Conventions

Requirements remain ranked **High**, **Medium**, and **Low** by core importance. Traceable requirements use the prefix **REQ-** and numbers consistent with the original SRS where the behavior is unchanged; **REQ-A#** denotes additions or materially revised requirements reflecting as-built behavior.

### 1.3 Intended Audience and Reading Suggestions

- **Developers / technical team:** Sections 3–4 (interfaces and features).  
- **Supervisors / evaluators:** Sections 1–2 and 5 (scope, architecture, quality).  
- **Testers:** Section 4 and Section 5.  
- **Maintainers:** Section 2 (architecture) and Section 3 (integration points).

### 1.4 Product Scope

SignVerse remains a **web application** that narrows the communication gap between ASL users and the hearing community through:

1. **Sign-to-text (and optional speech):** Webcam capture, server-side perception, and English output (with optional display translation and TTS).  
2. **Text-to-sign:** English input is converted to an **ASL gloss sequence**, then to **2D skeleton-style keyframe animation** played in the browser.  
3. **Interactive learning:** Lessons, quizzes, and practice with **server-side sign classification** and **alphabet image classification**, with **progress persistence** (Firebase for authenticated users, browser storage for guests).

The product goal—**sentence-oriented** communication and learning—is unchanged. Linguistic “polish” for sign-to-text is achieved through **deterministic gloss-to-English templates** (word mode), **segmentation + sequence assembly** (sentence mode), optional **machine translation for display**, and a client-side **Non-Semantic Output Refiner (NSOR)** that adjusts **only** capitalization, whitespace, and terminal punctuation on the **exact** English string returned by the API—**without** changing words or order (no BERT / LLM in the refinement path).

---

## 2. Overall Description

### 2.1 Product Perspective

SignVerse is a **client–server web system** with the following **as-built** architecture:

| Layer | Implementation |
|--------|----------------|
| **Client** | **React 18** + **TypeScript**, **Vite** build tool, **Tailwind CSS**, **shadcn/ui** (Radix), **React Router**, **TanStack Query**. Webcam access via **WebRTC `getUserMedia`** (no WebSocket video channel). **Sign-to-text page** stores **`translationRaw`** from the API and derives **`translationDisplay`** via **NSOR** (`frontend/src/lib/nsor.ts`) for the English line, **Speak**, and **Copy**; **`/api/translate`** is called with **`translationRaw`** so multilingual MT stays aligned with classifier output. |
| **Primary API / AI inference** | **FastAPI** (Python), **Uvicorn**, deployed as a **Hugging Face Space** (single service hosting sign-to-text, text-to-sign, translation/TTS proxies, and integrated learning routes). |
| **Optional local demo auth** | Small **Express (Node.js)** app with static `demo-users.json`—**not** the main AI path; production auth for the SPA is **Firebase Authentication**. |
| **Sign-to-text perception** | **OpenCV** (headless): JPEG decode, resize (`INTER_AREA`), optional max-side clamp (`MEDIAPIPE_MAX_FRAME_SIDE`, default 480). **MediaPipe Holistic** (`static_image_mode=True`) for pose/hands. **PyTorch** classifier: **Conv1D stem + learned CLS token + sinusoidal positional encoding + `TransformerEncoder` + linear head** on **225-D** per-frame landmark vectors, **sequence length 64**, **wrist-relative normalization (“v5”)** matching training export. |
| **Sign-to-text language layer (English)** | **Word mode:** single gloss → **curated `SIGN_SENTENCES` map** to fluent short English. **Sentence mode:** **wrist-velocity** sign boundaries (with **equal-split fallback**), **per-segment** classification, **deduplication** of consecutive identical signs, then **light server-side string formatting** (capitalization, trailing period). **No** server-side n-gram or Viterbi decoding is part of the specified path: the API returns a fixed string from the classifier and templates/segmentation. The SPA applies **NSOR** (`frontend/src/lib/nsor.ts`) so **`translationDisplay`** refines **`translationRaw`** with **only** whitespace, first-letter capitalization, and terminal punctuation—**no** token insert/delete/reorder (see **REQ-A6**). |
| **Multilingual display & TTS** | **Google Translate–compatible HTTP endpoints** (client `translate_a/single` for text; server-side proxy `translate_tts` for audio). **Browser `speechSynthesis`** for English; non-English speech prefers **`GET /api/tts`** on the FastAPI host. |
| **Text-to-sign** | **No PoseFormer** in the inference path. **Rule-based English → ASL gloss** (`to_asl` in `text_to_sign_backend.py`), then lookup in **`database.json`** (gloss → ordered list of **75×[x,y]** “mannequin” frames). **Ease-in-out interpolation** between clip boundaries. |
| **Learning module** | Structured **routes** under `/learning` (hub, learn easy/medium/hard, quizzes). **Alphabet:** `POST /api/learning/predict` (integrated `learning_backend.py`)—**OpenCV** decode/resize to **224×224**, **ImageNet normalization**, **PyTorch** CNN (checkpoint-dependent architecture). **Sign practice:** same **`/api/sign-to-text`** pipeline as Module 1. **Progress:** **Firestore** document `users/{uid}` with `learningProgress` when Firebase is configured; else **localStorage** guest profile. |
| **Data / training provenance** | The repository ships **inference checkpoints** and optional **`database.json`** (or Hub download). **Offline training** procedures and hyperparameters are documented in **`Codes_for_training.txt`** (not executed as part of the CI build): **sign-to-text** from **Google ASL Signs** parquet → wrist-relative **(64×225)** `.npy` cache, augmentations (time-stretch, Gaussian noise, frame mask), **Conv1D + CLS + TransformerEncoder** classifier; **text-to-sign research/authoring** from **How2Sign Holistic** `.npy`, **`ASLGrammarTransformerV2`**, **`transformers` `EncoderDecoderModel` (BERT-base)**, **PoseFormer**, **BoneTransformer**, then export/selection of **2D keyframes** into **`database.json`** for the deployed path. **Accuracy** should be reported against those corpora and the **bundled vocabulary**. |

**Communication pattern:** The SPA sends **HTTPS JSON** payloads (base64 JPEG `data:` URLs or raw base64) to REST endpoints—**not** continuous WebSocket video streaming.

#### 2.1.1 Offline training stacks (`Codes_for_training.txt`)

| Module | Primary data | Key libraries | Model / pipeline |
|--------|----------------|---------------|------------------|
| **Sign-to-text (v5)** | **Google ASL Signs** (Kaggle `train.csv` + parquet), **225** features per frame (**21 RH + 21 LH + 33 pose** × xyz), **seq 64** | **PyTorch**, **pandas**, **NumPy**, multiprocessing cache | **`normalize_landmarks`** (wrist / shoulder relative—**must match** `app.py`), **WeightedRandomSampler**, **Conv1D×2 stem**, **learned CLS**, **SinPE**, **`TransformerEncoder`×4**, **Linear** head on **CLS**; augment: **time_stretch**, **Gaussian noise**, **frame mask**; **no flip / no post-norm scale** |
| **Text-to-sign (research)** | **How2Sign Holistic** `.npy` (MediaPipe ordering, ~**25 FPS**), sentence CSV metadata | **PyTorch**, **`transformers==4.41.0`**, **BertTokenizer**, **EncoderDecoderModel**, **sacrebleu** / **NLTK** (as in scripts) | **`ASLGrammarTransformerV2`** (rule gloss) → **BERT enc-dec** gloss refinement → **PoseFormer** (causal **`TransformerEncoder`** + grouped **Conv1D** smooth) → **BoneTransformer** (bone vectors + temporal **Conv1D**) → **3D keypoints** / authoring outputs; **deployed** runtime uses **`database.json`** clips instead of loading `poseformer_best.pt` per request |

### 2.2 Product Functions

- **Sign-to-text:** User starts the camera, optionally selects **Word** or **Sentence** mode, presses **Record**, performs ASL, presses **Done** (or hits a **time cap**: ~5 s word / ~20 s sentence). The client captures **sampled JPEG frames**; the server returns English text (word mode: template sentence; sentence mode: joined gloss labels as a readable line), confidence, optional **detected word list**, and optional **translated text** for non-English UI language. The UI applies **NSOR** to that English for display and speech; **history** stores **raw** API strings and re-applies NSOR when rendering list entries. **Speak** uses browser or proxied TTS as above.  
- **Text-to-sign:** User enters English; **`POST /api/text-to-sign`** returns `gloss`, `frames`, `fps` (default 20). The **canvas** draws a **2D stick figure** from mannequin keypoints (`textToSignMannequin.ts`). **Playback** controls (play/pause, speed, loop, scrub) are implemented on the Text-to-Sign page.  
- **Learning:** Catalog-driven content (`learningData.ts`), **AvatarPlayer** can render **mannequin** or **MediaPipe-style** frame JSON when returned by APIs, quizzes, and **SignRecorder** practice verified via sign-to-text.  
- **Account / dashboard:** **Firebase** email/password; **Dashboard** aggregates learning stats from progress context.

### 2.3 User Classes and Characteristics

Unchanged from the original SRS: **Deaf and Hard-of-Hearing ASL users**, **hearing non-signers**, and **ASL learners**—with the same priority ordering.

### 2.4 Operating Environment

- **Browsers:** Modern Chromium/Firefox/Safari/Edge with **ES modules**, **Canvas**, **WebRTC**, **Fetch**, and (for English TTS) **Web Speech API** where available.  
- **Client build:** **Node.js** (for Vite) at dev/build time only.  
- **Server:** Python **3.11**-compatible environment per Space/Dockerfile; **CPU** inference (`torch` device CPU in `app.py`). GPU remains **recommended for offline training**, not assumed at inference for the deployed Space.  
- **Network:** Stable internet for SPA, Firebase (if enabled), Hugging Face API host, and Google endpoints used for translate/TTS.

### 2.5 Design and Implementation Constraints

| Original SRS constraint | As-built |
|-------------------------|----------|
| MediaPipe for pose/hands | **Satisfied** (Holistic). |
| 3D CNN + Transformer for sequence | **Replaced:** **1D convolutions over time** as stem + **Transformer encoder** on landmark sequences (no 3D CNN on RGB volumes in the deployed path). |
| BERT for grammatical English | **Sign-to-text inference:** **Template map** + **segmentation/assembly**; optional **MT** for non-English **display** only. **Text-to-sign training:** **BERT EncoderDecoder** gloss refinement (`Codes_for_training.txt`). |
| PoseFormer for text-to-sign | **Inference:** **Keyframe database** + interpolation. **Training:** **PoseFormer + BoneTransformer** on How2Sign (`Codes_for_training.txt`). |
| React frontend | **Satisfied** (Vite + React + TS). |
| Python + TF/PyTorch for AI | **PyTorch only** in shipped inference; **TensorFlow** not required for runtime. |
| Firebase for auth/storage | **Satisfied** for auth + learning progress; **Firestore** merge writes. |
| External TTS | **Satisfied** via **Google TTS URL** (proxied) + browser fallback. |
| How2Sign-only vocabulary | **Relaxed in repo:** vocabulary comes from **bundled `asl_idx2sign` / database**—not verified in-repo against How2Sign. |
| Node as primary backend for AI | **Not used** for model inference; **FastAPI** is the AI host. Optional Express demo remains ancillary. |

Timeline references (Oct 2025–May 2026) remain valid project planning context.

### 2.6 User Documentation

Same intent as the original SRS: user-facing help, technical architecture notes, test reports, deployment docs. The repository additionally contains internal processing notes under `docs/` (e.g. learning request flow).

### 2.7 Assumptions and Dependencies

- Users have a **working webcam** and grant **camera permission**.  
- **Firebase environment variables** (`VITE_FIREBASE_*`) are required for full auth/cloud progress; without them, the UI operates in a **degraded / guest** mode where documented.  
- **`VITE_API_URL`** (or equivalent) must point at the **FastAPI** deployment for sign/text/learning API calls.  
- **Text-to-sign** requires an available **`database.json`** (local, env path, or Hub download per `TEXT_TO_SIGN_*` variables).  
- **Third-party** Google endpoints may change or rate-limit; the system degrades gracefully (copy original text, TTS errors surfaced as HTTP 502 from `/api/tts`).  
- **GPU** on the inference host is **optional**; CPU latency applies.

---

## 3. External Interface Requirements

### 3.1 User Interfaces

**Technology:** React SPA with component library as in §2.1.

**Information architecture (as-built routes):**

- **Public marketing / entry:** `/` (`PublicHome`), `/learn-more`, `/welcome` (`Index`).  
- **Auth:** `/login`, `/signup`.  
- **Authenticated hub:** `/dashboard` (protected with `RequireAuth`).  
- **Sign-to-text:** `/sign-to-text` (public route in current router).  
- **Text-to-sign:** `/text-to-sign` (public).  
- **Learning subtree:** `/learning`, `/learning/learn`, `/learning/learn/easy|medium|hard`, `/learning/quiz`, `/learning/quiz/alphabets|words|sentences`.  
- **Legal / accessibility:** `/privacy-policy`, `/terms-of-service`, `/accessibility`.

**Sign-to-text UI:** Live camera preview, **mode toggle** (word/sentence), **Record / Done** workflow, **processing** state, **translation** panel with optional **second-language** line, **confidence** chip, **sentence word chips** (sentence mode), **Speak / Copy / Clear**, **recent history**, **language selector**, backend readiness hint from **`GET /api/health`**. English shown in the main panel is **`translationDisplay`** = **NSOR**(`translationRaw`). **Note:** The as-built page **does not** paint MediaPipe landmarks over the video; overlays were planned in the original SRS but are **not** present on this view (tracking runs **server-side**).

**Text-to-sign UI:** Text area, translate action, **canvas avatar**, playback controls, FPS and speed, loop toggle.

**Learning UI:** Hub cards, lesson steps, quiz flows, progress headers, integration with **AvatarPlayer** / **SignRecorder** as implemented per route.

**Consistency:** Shared dark theme patterns, toast notifications, accessible components via Radix primitives where used.

### 3.2 Hardware Interfaces

- **Webcam:** Same as original SRS—USB or built-in camera; browser APIs.  
- **GPU:** Optional for deployment; training-time recommendation unchanged.

### 3.3 Software Interfaces

| Interface | As-built role |
|-----------|----------------|
| **MediaPipe** | Holistic landmarks from **RGB** frames prepared after OpenCV decode/resize. |
| **OpenCV (`opencv-python-headless`)** | JPEG decode, resizing, color conversion **before** MediaPipe and for alphabet CNN input. |
| **PyTorch** | ASL sequence classifier; alphabet classifier; model load via `torch.load`. |
| **FastAPI / Uvicorn** | REST endpoints: `/api/sign-to-text`, `/api/sign-to-sentence`, `/api/translate`, `/api/tts`, `/api/text-to-sign`, `/api/health`, `/api/login`, integrated `/api/learning/predict`, etc. |
| **React / Vite / Tailwind / shadcn** | SPA implementation. |
| **NSOR (`refineNonSemantic`)** | Client-only **deterministic** post-process: trim, collapse whitespace, capitalize first alphabetic character, optional terminal `.` `?` `!` (default: append `.` if none). **Does not** call the backend or alter recognition. |
| **Firebase (Auth + Firestore)** | User accounts; **`learningProgress`** sync. |
| **Google Translate (unofficial/simple HTTP)** | Text translation + TTS audio fetch (server-proxied TTS). |
| **`database.json` (+ Hub helpers)** | Text-to-sign animation source. |
| **Express (optional)** | Demo-only login API on port 3000 in `backend/`—not part of Hugging Face inference. |

**Training vs runtime:** **`transformers` / BERT EncoderDecoder** appear in **`Codes_for_training.txt`** for **offline English→ASL gloss** refinement; they are **not** invoked by **`/api/sign-to-text`** or **`/api/sign-to-sentence`**. The Space **`requirements.txt`** may still list **`transformers`** for environment parity with training notebooks even when those code paths are idle in production.

### 3.4 Communications Interfaces

- **HTTPS / JSON REST** between SPA and FastAPI (CORS enabled on API).  
- **No WebSocket** transport for sign video in the as-built system.  
- **Firebase** SDK (client) for auth and Firestore listeners.  
- **WebRTC** only for **local** camera capture—not for server streaming.

---

## 4. System Features

### 4.1 Sign-to-Text / Speech Translation

#### 4.1.1 Description and Priority

**High priority**—unchanged intent: ASL performance is converted to **English text**, with optional **other-language display** and **speech output**.

#### 4.1.2 Stimulus / Response Sequences

1. User opens **Sign-to-text**, starts camera.  
2. User selects **Word** or **Sentence** mode and optional **UI language**.  
3. User presses **Record**; client appends **JPEG data URLs** on an interval (**~6.7 fps** word / **~5 fps** sentence).  
4. User presses **Done** or recording hits **duration cap**.  
5. Client **`POST`s** `{ frames, language }` to `/api/sign-to-text` or `/api/sign-to-sentence`.  
6. Server: OpenCV decode → resize → MediaPipe → landmark normalization → gates (**hand presence**, conditional **motion**) → PyTorch **Conv1D+Transformer** classifier.  
7. **Word mode:** best sign → **`SIGN_SENTENCES` template** English string.  
8. **Sentence mode:** velocity (and fallback) **segments** → classify → **dedupe** → **joined** sentence string + per-word confidences.  
9. Client stores the English string as **`translationRaw`** and shows **`translationDisplay` = NSOR(`translationRaw`)** in the main text area; **Speak** / **Copy** (for English) use **`translationDisplay`**.  
10. If UI language ≠ `en`, client calls **`/api/translate`** with **`translationRaw`** (not the NSOR’d string) so machine translation tracks classifier wording.  
11. **Speak:** For English, **`speechSynthesis`** on **`translationDisplay`**; other languages via **`/api/tts`** (MP3) with browser fallback on **`displayText`** (translated line when present).

#### 4.1.3 Functional Requirements

| ID | Requirement | As-built status |
|----|-------------|-----------------|
| REQ-1 | Webcam video input suitable for recognition | **Met** via sampled JPEG capture + server-side processing. |
| REQ-2 | MediaPipe hand + pose information | **Met** (Holistic). |
| REQ-3 | Temporal sequence modeling for recognition | **Met** with **Conv1D + TransformerEncoder** on landmark sequences (**not** 3D CNN on voxels). |
| REQ-4 | Whole signed sentences (not only isolated fingerspelling by default) | **Met** in **Sentence mode** within segmenter + model limits. |
| REQ-5 | NLP to produce grammatical English | **Revised:** **Template lexicon** (word mode) + **simple sentence formatting** (sentence mode). **No BERT inference.** **NSOR** satisfies the “refinement” expectation for **orthography / punctuation only** on the client. |
| REQ-6 | Show translated text in UI | **Met.** |
| REQ-7 | Optional speech output | **Met** (browser + `/api/tts`). |
| REQ-8 | Multilingual speech / display | **Met** via **Google Translate endpoints** + language map (`en`, `ur`, `ar`, `fr`, `es`, `de`, `zh` → `zh-CN` internally). |
| REQ-9 | ASL spatial grammar, non-manual markers, full English parity | **Partial / best-effort**—limited by **landmark-only** models and **template/corpus** coverage (inherent limitation, called out explicitly). |
| REQ-10 | MediaPipe keypoint overlays on live video | **Not met on Sign-to-text page** (server-side MediaPipe only). **REQ-A1:** Optional future overlay or debug view. |
| REQ-11 | Context-aware fluent text | **Partial**—fluency bounded by templates / segmentation; no large-language-model rewrite in production. |
| REQ-12 | Accuracy tied to training distribution | **Revised:** Accuracy tied to **shipped vocabulary & checkpoints**; How2Sign linkage **not enforced in repository artifacts**. |

**REQ-A2 (High):** The system SHALL expose **`GET /api/health`** reporting readiness of MediaPipe, classifier, and sentence pipeline prerequisites.

**REQ-A3 (Medium):** The system SHALL support **explicit Word vs Sentence** recording profiles with documented **frame intervals** and **duration caps**.

**REQ-A6 (High):** The system SHALL implement a **Non-Semantic Output Refiner (NSOR)** on the sign-to-text page that produces **`translationDisplay`** from **`translationRaw`** using **only** an explicit allow-list of transforms (trim, internal whitespace collapse, first-letter capitalization, terminal punctuation). The refiner SHALL **not** insert, delete, or reorder content-bearing tokens relative to **`translationRaw`**.

---

### 4.2 Text-to-Sign Translation

#### 4.2.1 Description and Priority

**High priority**—unchanged user goal: English sentences → **visual ASL representation** via animated **2D skeleton**.

#### 4.2.2 Stimulus / Response Sequences

1. User enters English in **Text-to-sign**.  
2. SPA calls **`POST /api/text-to-sign`**.  
3. Server builds **ASL gloss** (`to_asl`), tokenizes, concatenates clips from **`database.json`**, smooths transitions.  
4. Client animates **mannequin** skeleton frames on canvas.

#### 4.2.3 Functional Requirements

| ID | Requirement | As-built status |
|----|-------------|-----------------|
| REQ-13 | English text input | **Met.** |
| REQ-14 | Identify ASL sign sequence | **Met** as **gloss tokens** from rules + dictionary keys. |
| REQ-15 | PoseFormer for skeleton generation | **Not used at inference.** **Training:** PoseFormer + BoneTransformer on How2Sign (`Codes_for_training.txt`). **Product:** **pre-authored keyframe sequences** per gloss in **`database.json`**. |
| REQ-16 | 2D skeleton avatar | **Met** (mannequin rig / canvas). |
| REQ-17 | Dedicated visualization region | **Met** on Text-to-Sign view & learning avatar surfaces. |
| REQ-18 | Playback controls | **Met** (play/pause/reset/scrub/speed/loop—see UI). |
| REQ-19 | Semantic fidelity | **Partial**—depends on **database coverage** and **gloss rules** (`AUX` removal, question words, negation handling). |
| REQ-20 | English grammar → ASL ordering | **Partial** via **`to_asl`** heuristics—not a full statistical MT system. |
| REQ-21 | Smooth animation | **Met** between clips via **eased interpolation**. |
| REQ-22 | Interactive latency | **Met** modulo **`database.json`** size / network fetch on cold start. |

**REQ-A4 (Medium):** The system SHALL allow configuring **`database.json`** location via documented environment variables (`TEXT_TO_SIGN_DATABASE`, `TEXT_TO_SIGN_HF_*`).

---

### 4.3 Interactive Learning Module

#### 4.3.1 Description and Priority

**Medium priority** educational value—unchanged.

#### 4.3.2 Stimulus / Response Sequences

User navigates **Learning** routes, studies content, launches quizzes, practices signs; **SignRecorder** posts frames to **`/api/sign-to-text`**; alphabet quizzes post frames to **`/api/learning/predict`**; progress persists to **Firestore** or **guest storage**.

#### 4.3.3 Functional Requirements

| ID | Requirement | As-built status |
|----|-------------|-----------------|
| REQ-23 | Organized sign database | **Met** via `learningData.ts` + backend assets. |
| REQ-24 | Instructional material | **Met** per lesson/quiz pages. |
| REQ-25 | Practice mode | **Met** (`SignRecorder`, modes). |
| REQ-26 | Webcam recording | **Met** (same capture pattern as translation module). |
| REQ-27 | Compare attempts to reference | **Met** (classification vs expected label / word). |
| REQ-28 | Performance feedback | **Met** (correct/incorrect UI, scores in quizzes). |
| REQ-29 | Progress across sessions | **Met** with **Firebase** + **local guest** merge strategy. |
| REQ-30 | Progress visibility | **Met** on Dashboard + learning headers. |
| REQ-31 | Navigate lessons/signs | **Met** via router + hub. |
| REQ-32 | Gradual skill scaffolding | **Met** (easy/medium/hard + quiz tiers). |
| REQ-33 | Unified web app | **Met** under one SPA. |

**REQ-A5 (Low):** Optional **`VITE_LEARNING_BACKEND_URL`** when learning endpoints are split to another host (defaults to main API base).

---

## 5. Other Nonfunctional Requirements

### 5.1 Performance Requirements

- End-to-end latency is dominated by **JPEG batch upload**, **per-frame MediaPipe**, and **CPU PyTorch** inference—acceptable for **interactive** use but **not** hard real-time streaming as originally implied by WebSocket video.  
- Sentence mode encourages **clear pauses** between signs to aid segmentation.  
- Animation targets **~20 fps** default for text-to-sign playback.  
- Other performance attributes from the original SRS (broadband usability, smooth avatar) remain **design goals**, subject to client device and API cold-start.

### 5.2 Safety Requirements

Unchanged principles: camera only when user initiates, constructive feedback, graceful errors, culturally neutral avatar styling.

### 5.3 Security Requirements

- **HTTPS** for production hosting (Vercel / HF Space as deployed).  
- **Firebase** security rules assumed for Firestore.  
- **Input validation** on API bodies (FastAPI / Pydantic).  
- Webcam permission UX unchanged.

### 5.4 Software Quality Attributes

| Attribute | As-built notes |
|-----------|----------------|
| **Reliability** | Health endpoint + explicit no-sign responses (`no_sign_detected`). |
| **Usability** | Dashboard + learning hub + mode toggles. |
| **Maintainability** | Modular split: `app.py`, `learning_backend.py`, `text_to_sign_backend.py`, SPA pages/libs, **`frontend/src/lib/nsor.ts`** (+ Vitest `nsor.test.ts`). |
| **Portability** | Web stack; API containerized on HF. |
| **Precision** | **No BERT-level** semantic repair; quality is **model + templates + DB** bound. **NSOR** is deterministic and does not override classifier tokens. |
| **Testability** | `vitest` present in frontend; API testability via OpenAPI `/docs`. |

### 5.5 Business Rules

- **ASL** remains the target signed language for recognition content **as defined by training checkpoints**.  
- **Free web access** goal unchanged.  
- **User-owned progress** when cloud sync is enabled.

---

## References

[1] IEEE-style SRS baseline: `SRS-SignVerse.md` (revised April 2026 to align training vs inference with `Codes_for_training.txt` and the deployed repo).

[2] SignVerse API implementation: `huggingface-space/app.py` (SignVerse API v6.2 — Conv1D+Transformer ASL model, MediaPipe Holistic, segmentation, translation/TTS routes).

[3] Text-to-sign implementation: `huggingface-space/text_to_sign_backend.py` (gloss rules + `database.json`).

[4] Learning API implementation: `huggingface-space/learning_backend.py` (alphabet prediction, OpenCV + PyTorch).

[5] Frontend routing and features: `frontend/src/App.tsx`, pages under `frontend/src/pages/`, **NSOR** in `frontend/src/lib/nsor.ts` (sign-to-text display pipeline in `SignToText.tsx`).

[6] Consolidated **offline training** notebooks/scripts: `Codes_for_training.txt` (text-to-sign: How2Sign Holistic, `ASLGrammarTransformerV2`, `EncoderDecoderModel` from BERT-base, PoseFormer, BoneTransformer; sign-to-text: ASL Signs parquet→normalized `.npy`, Conv1D+Transformer v5).

[7] “A real-time CNN and LSTM-based SLR system for isolated signs,” *Sensors*, vol. 25, no. 7, Art. no. 2138, 2025. [Online]. Available: https://www.mdpi.com/1424-8220/25/7/2138

[8] F. Khan et al., “Sign language recognition using MediaPipe and LSTM,” *International Journal of Research in Programming and Robotics (IJRPR)*, vol. 6, no. 4, 2023. [Online]. Available: https://ijrpr.com/uploads/V6ISSUE4/IJRPR41472.pdf

[9] A. Kumar et al., “SLRNet: A real-time LSTM-based sign language recognition system,” 2024. [Online]. Available: https://www.researchgate.net/publication/392716727_SLRNet_A_Real-Time_LSTM-Based_Sign_Language_Recognition_System

[10] F. Khan et al., “SLRNet: A real-time LSTM-based sign language recognition system,” 2024. [Online]. Available: https://discovery.researcher.life/download/article/feaf24376a7435fba7259046f9f734b3/full-text

[11] R. Gaikwad, “Sign language recognition of words and sentence prediction using LSTM and NLP,” 2024. [Online]. Available: https://www.researchgate.net/publication/388439260_SIGN_LANGUAGE_RECOGNITION_OF_WORDS_AND_SENTENCE_PREDICTION_USING_LSTM_AND_NLP

---

## Appendix: Concise change ledger (original SRS → as-built)

| Area | Original SRS | As-built |
|------|----------------|----------|
| Sign recognition core | 3D CNN + Transformer on video | **Landmark sequence → Conv1D stem + TransformerEncoder** (PyTorch) |
| OpenCV | Not emphasized | **Decode / resize / color convert** on server |
| NLP / English fluency | BERT refinement | **Gloss-to-English templates** + **segment/dedupe**; **optional Google Translate** for UI language; **NSOR** for client-only capitalization / punctuation / whitespace on `translationRaw` |
| Bigram / Viterbi | Not in original | **Not part of the as-built product.** There is **no** language-model decoding step between the classifier and the English string returned to the client. **NSOR** (client) plus **templates / segmentation / dedupe** (server) deliver the documented behavior. |
| Text-to-sign generation | PoseFormer at runtime | **Offline:** PoseFormer + BoneTransformer on How2Sign (`Codes_for_training.txt`); **Runtime:** **`database.json` keyframes** + interpolation |
| Avatar data | PoseFormer output | **75-point 2D mannequin** in product (`database.json`); **3D** PoseFormer output used in **training/export** workflows |
| Transport | WebSocket video | **HTTPS POST** of frame batches |
| Primary AI backend | Python + Node mention | **FastAPI** primary; **Node Express** ancillary demo only |
| Frontend | React | **React + Vite + TS + Tailwind + shadcn** |
| Live keypoint overlay | Required on sign-to-text capture | **Not implemented** on that page |
| Site structure | Three functional areas | **Added** public landing, learn-more, legal pages; **dashboard** behind auth; learning/sign tools routing as implemented |
| How2Sign | Mandatory training data reference | **Holistic `.npy` pipeline** documented in **`Codes_for_training.txt`**; **repo** ships **inference artifacts**, not raw How2Sign |
| `transformers` / BERT | Planned stack | **Offline T2S gloss** in `Codes_for_training.txt`; **not** sign-to-text English repair at inference |
| ASL Signs (Kaggle) | Not in original SRS | **Sign-to-text v5 training** source (parquet→`.npy`), per `Codes_for_training.txt` |

---

*End of document.*
