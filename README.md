# SignVerse

**A Bidirectional American Sign Language (ASL) Translation and Learning Platform**

SignVerse bridges the communication gap between the Deaf/HoH community and hearing individuals through real-time AI-powered sign language recognition, animated sign generation, and structured ASL learning — all in a browser with no installation required.

---

## Features

| Module | Description |
|---|---|
| **Sign-to-Text** | Translate live ASL signs from your webcam into English text in real time |
| **Text-to-Sign** | Convert English sentences into smooth 2D avatar animations performing ASL |
| **Learning** | Three-tier curriculum — fingerspelling (Easy), word signs (Medium), sentence signs (Hard) |

Additional capabilities:
- Multilingual output (Urdu, Arabic, French, Spanish, German, Chinese) via Google Translate
- Text-to-Speech for translated text
- Progress tracking persisted to Firebase (or localStorage for guest users)
- Responsive dark-themed UI

---

## Architecture

SignVerse is a three-tier decoupled web application:

```
┌─────────────────────┐     HTTPS/REST      ┌──────────────────────────────┐
│   Vercel (CDN)      │ ◄─────────────────► │   Hugging Face Spaces        │
│   React 18 SPA      │   JSON + base64      │   FastAPI · PyTorch          │
│   TypeScript        │   JPEG frames        │   MediaPipe · NumPy · OpenCV │
└─────────────────────┘                      └──────────────────────────────┘
           │                                              │
           │ Firebase SDK                                 │ HF Hub (model weights)
           ▼                                              ▼
┌─────────────────────┐                      ┌──────────────────────────────┐
│   Firebase          │                      │   Model Registry             │
│   Authentication    │                      │   asl_best.pt (~30 MB)       │
│   Firestore DB      │                      │   signverse_asl_classifier   │
└─────────────────────┘                      └──────────────────────────────┘
```

---

## Tech Stack

**Frontend**
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui (Radix UI primitives)
- Firebase SDK (Auth + Firestore)
- TanStack Query
- Canvas API (2D avatar rendering)

**AI Backend**
- FastAPI + Uvicorn (async ASGI)
- PyTorch 2.2 — Conv1D + TransformerEncoder sign classifier
- MediaPipe Holistic — 225-D landmark extraction (33 pose + 21+21 hand keypoints)
- OpenCV — JPEG decode + frame resize
- NumPy — temporal resampling, wrist-relative normalization

**Infrastructure**
- Frontend: Vercel (global CDN, SPA routing)
- Backend: Hugging Face Spaces (Docker container, Python 3.11, CPU)
- Auth & DB: Firebase (Google Cloud)

---

## How It Works

### Sign-to-Text Pipeline

1. Browser captures webcam frames at 10 fps as base64 JPEG via Canvas API
2. Frame batch sent as JSON `POST /api/sign-to-text` to the FastAPI backend
3. Parallel JPEG decode with OpenCV + ThreadPoolExecutor
4. MediaPipe Holistic extracts 225-D landmark vector per frame
5. Motion gating rejects idle or hand-absent submissions
6. Variable-length sequence resampled to fixed 64 frames; wrist-relative normalization applied
7. Conv1D stem (local temporal features) → 4-layer TransformerEncoder with CLS token → 250-class prediction
8. NSOR (Non-Semantic Output Refiner) formats classifier output as display-ready text
9. Optional: Google Translate API → multilingual output; Google TTS → audio playback

### Text-to-Sign Pipeline

1. English input processed by rule-based `to_asl()` — removes articles/auxiliaries, fronts time markers
2. Each ASL gloss token looked up in `database.json` (pre-generated keyframe library from How2Sign + Google ASL)
3. Clips concatenated with 7 quadratic eased transition frames for smooth word-to-word motion
4. Gaussian temporal smoothing (radius=2, sigma=1.0) suppresses dataset noise
5. Frontend renders 2D stick-figure avatar on `<canvas>` at ~60 fps with sub-frame interpolation

### Learning Module

| Level | Method | Model |
|---|---|---|
| Easy (Alphabet) | CNN classifies single webcam frame | `signverse_asl_classifier.pt` |
| Medium (Words) | Full Sign-to-Text pipeline verifies attempt | `asl_best.pt` TransformerEncoder |
| Hard (Sentences) | Wrist-velocity boundary detection → per-segment classification → Viterbi + Bigram LM | `asl_best.pt` + Bigram decoder |

---

## Model Details

| Parameter | Value |
|---|---|
| Training dataset | Google ASL Signs (Kaggle, 250 classes) |
| Input shape | `(64 frames, 225 features)` |
| Architecture | Conv1D stem → 4× TransformerEncoder (4 heads, d=256, ff=512) → CLS head |
| Normalization | Wrist-relative v5 (hand: wrist-origin + MCP scale; pose: shoulder-midpoint + shoulder-width scale) |
| Class imbalance | WeightedRandomSampler |
| Augmentations | Time stretching, Gaussian noise, frame masking |
| Inference device | CPU (Hugging Face free tier) |

---

## Project Structure

```
SignVerse/
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── pages/              # Route-level components
│   │   │   ├── SignToText.tsx  # Webcam capture + Sign-to-Text UI
│   │   │   ├── TextToSign.tsx  # Text input + avatar animation engine
│   │   │   ├── Learning.tsx    # Learning hub
│   │   │   └── learning/       # Easy / Medium / Hard level pages + AvatarPlayer
│   │   ├── lib/
│   │   │   ├── textToSignMannequin.ts  # 2D avatar renderer + interpFrames()
│   │   │   ├── learningData.ts         # ASL curriculum (words, sentences, alphabets)
│   │   │   ├── learningApi.ts          # API client for learning module
│   │   │   ├── learningProgress.ts     # Firestore / localStorage progress persistence
│   │   │   ├── nsor.ts                 # Non-Semantic Output Refiner
│   │   │   └── firebase.ts             # Firebase app initialization
│   │   ├── contexts/           # AuthContext, LearningProgressContext
│   │   ├── components/         # shadcn/ui components + landing page sections
│   │   └── hooks/              # use-mobile, use-toast, useScrollAnimate
│   ├── vercel.json             # SPA routing redirect config
│   └── vite.config.ts
│
├── huggingface-space/          # Python AI backend
│   ├── app.py                  # FastAPI app + ASLModel + full Sign-to-Text pipeline
│   ├── text_to_sign_backend.py # to_asl() + keyframe lookup + Gaussian smoothing
│   ├── learning_backend.py     # CNN alphabet classifier endpoint
│   ├── learning_api.py         # Learning route registration glue
│   ├── database.json           # Pre-generated ASL keyframe library (~50 MB)
│   ├── requirements.txt        # Python dependencies
│   └── Dockerfile              # Container spec for HF Spaces deployment
│
└── backend/                    # Local dev auth server (Node.js/Express, not deployed)
    ├── server.js
    └── demo-users.json
```

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- A Firebase project (Auth + Firestore enabled)

### 1. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:7860
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

```bash
npm run dev        # Dev server at http://localhost:5173
npm run build      # Production build → frontend/dist/
```

### 2. AI Backend

```bash
cd huggingface-space
pip install -r requirements.txt
```

Model weights (`asl_best.pt`, `sign_to_idx.json`, `signverse_asl_classifier.pt`, `class_mapping.json`) are downloaded automatically from Hugging Face Hub on first startup.

```bash
uvicorn app:app --host 0.0.0.0 --port 7860 --reload
```

API documentation available at `http://localhost:7860/docs`.

### 3. Local Auth Server (optional)

```bash
cd backend
npm install
node server.js     # Demo login endpoint at http://localhost:3001
```

---

## Deployment

### Frontend — Vercel

1. Connect your GitHub repository to Vercel
2. Set **Root Directory** to `frontend`
3. Add all `VITE_*` environment variables in Vercel project settings
4. Deploy — Vercel handles build (`npm run build`) and CDN distribution automatically
5. `vercel.json` is pre-configured to redirect all routes to `index.html` for client-side routing

### Backend — Hugging Face Spaces

1. Create a new Space (Docker SDK) on [huggingface.co/spaces](https://huggingface.co/spaces)
2. Push the contents of `huggingface-space/` to the Space repository
3. Set Space secrets: `HF_TOKEN` (for model weight downloads), any API keys
4. The `Dockerfile` handles all Python dependency installation and server startup automatically

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/sign-to-text` | POST | Classify a batch of base64 JPEG frames → top-3 ASL sign predictions |
| `/api/sign-to-sentence` | POST | Sentence-mode classification with boundary detection + Viterbi decoding |
| `/api/text-to-sign` | POST | English text → ASL gloss → smoothed keyframe animation JSON |
| `/api/learning/predict` | POST | Single JPEG frame → A–Z fingerspelling prediction (CNN) |
| `/api/translate` | POST | English text → target language via Google Translate |
| `/api/tts` | POST | Text → base64 audio via Google TTS |
| `/api/health` | GET | Backend health check |

All endpoints accept and return `application/json`. Full interactive docs at `/docs` (Swagger UI).

---

## Datasets

| Dataset | Source | Usage |
|---|---|---|
| **Google ASL Signs** | Kaggle (2023 competition) | Training `asl_best.pt` — 250 isolated ASL sign classes, MediaPipe landmark sequences in Parquet format |
| **How2Sign** | CVPR 2021 | Offline generation of `database.json` keyframe library using PoseFormer + BoneTransformer — not used at inference time |
| **ASL Alphabet** | Kaggle (static hand images) | Training `signverse_asl_classifier.pt` — A–Z fingerspelling CNN classifier |

---

## Known Limitations

- **Vocabulary bound:** Sign-to-Text recognizes only the 250 classes present in the training data. Unseen signs are mapped to the nearest trained class.
- **No non-manual markers:** Facial expressions and mouthing carry grammatical meaning in ASL but are not included in the feature vector.
- **Heuristic grammar conversion:** `to_asl()` approximates ASL word order (article removal, temporal fronting) but does not model spatial referents or classifiers.
- **CPU-only inference:** Hugging Face free tier has no GPU — inference latency is 2–5 seconds per request.
- **Dataset mixing:** `database.json` combines one-handed Google ASL clips with two-handed How2Sign clips; occasional visual discontinuities can occur at word boundaries.

---

## Team

| Name | ID | Role |
|---|---|---|
| Talha Zafar | BSCS-212-E | Full-Stack Development, AI Pipeline, Deployment |
| Uzair Moazzam | BSCS-203-E | Frontend Development, Learning Module, UI/UX |


---

## License

This project was developed as an academic Final Year Project. All rights reserved by the authors and Lahore Garrison University.
