# app.py (Hugging Face Backend)
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import re

app = FastAPI()

# Allow your Vercel frontend to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Change this to your Vercel URL in production for security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading 350MB Database into server memory...")
with open("database.json", "r", encoding="utf-8") as f:
    WORDS_DB = json.load(f)
print("Database loaded successfully!")

AUX = {'is','are','was','were','am','be','do','does','did','has','have','will','can'}

def to_asl(s):
    if not s: return ''
    s = s.strip().lower().replace("don't", "do not").replace("doesn't", "does not")
    t = re.findall(r'[a-z]+', s)
    t = [x for x in t if x != 'not' and x not in ['a','an','the','to','of','in','at','on','for','with','by','from']]
    if not t: return ''
    
    if t[0] in ['what','where','when','who','why','how']:
        t = [t[0]] + [x for x in t[1:] if x not in AUX]
    else:
        t = [x for x in t if x not in AUX]
        
    tm = [x for x in t if x in ['yesterday','today','tomorrow','now']]
    t = tm + [x for x in t if x not in ['yesterday','today','tomorrow','now']]
    
    if 'not' in s: t.append('not')
    return ' '.join(t).upper()

def is_missing(pt):
    return abs(pt[0]) < 0.001 and abs(pt[1]) < 0.001

def build_anim(tokens):
    seq = []
    TF = 5
    clips = []
    
    for t in tokens:
        # Find exact match ignoring case/spaces
        real_key = next((k for k in WORDS_DB.keys() if k.strip().upper() == t), None)
        if real_key:
            clips.append(WORDS_DB[real_key])
            
    if not clips: return None
    
    for f in clips[0]: seq.append(f)
    
    for i in range(1, len(clips)):
        c1 = clips[i-1][-1]
        c2 = clips[i][0]
        
        # 5-Frame Transition
        for t in range(1, TF + 1):
            a = t / (TF + 1)
            x = 2 * a * a if a < 0.5 else 1 - pow(-2 * a + 2, 2) / 2
            trans_frame = []
            
            for kp in range(75):
                if is_missing(c1[kp]) or is_missing(c2[kp]):
                    trans_frame.append([0.0, 0.0])
                else:
                    trans_frame.append([
                        c1[kp][0] * (1 - x) + c2[kp][0] * x,
                        c1[kp][1] * (1 - x) + c2[kp][1] * x
                    ])
            seq.append(trans_frame)
            
        for f in clips[i]: seq.append(f)
        
    return seq

class SignRequest(BaseModel):
    text: str

@app.post("/api/text-to-sign")
def translate_text(req: SignRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
        
    gloss = to_asl(req.text)
    tokens = [x for x in gloss.split(' ') if x]
    
    sequence = build_anim(tokens)
    
    if not sequence:
        raise HTTPException(status_code=404, detail=f"Vocabulary missing for: {req.text}")
        
    return {
        "gloss": gloss,
        "frames": sequence,
        "fps": 20
    }