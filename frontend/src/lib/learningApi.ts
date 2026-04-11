const API_BASE = import.meta.env.VITE_API_URL || "https://talhazafar7406-signverse-api.hf.space";
const LEARNING_API_BASE = import.meta.env.VITE_LEARNING_API_URL || "http://localhost:7861";

export { API_BASE, LEARNING_API_BASE };

export async function fetchAvatarFrames(text: string) {
  const res = await fetch(`${API_BASE}/api/text-to-sign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Failed to fetch avatar animation`);
  return res.json();
}

export async function verifySignRecording(
  frames: string[],
  expectedWord: string,
): Promise<{ correct: boolean; detectedSign: string; confidence: number }> {
  const res = await fetch(`${API_BASE}/api/sign-to-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ frames, language: "en" }),
  });
  if (!res.ok) throw new Error("Failed to verify sign");
  const data = await res.json();

  if (data.no_sign_detected) {
    return { correct: false, detectedSign: "none", confidence: 0 };
  }

  const detected = (data.sign || "").toLowerCase().trim();
  const expected = expectedWord.toLowerCase().trim();
  const correct = detected === expected;

  return {
    correct,
    detectedSign: data.sign || "unknown",
    confidence: data.confidence || 0,
  };
}

/** POST /api/learning/predict — single JPEG frame, alphabet classifier (same Space as Sign-to-Text). */
export async function predictAlphabetFromFrame(frameDataUrl: string): Promise<{
  letter: string;
  confidence: number;
  top3: { letter: string; confidence: number }[];
}> {
  const res = await fetch(`${API_BASE}/api/learning/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ frame: frameDataUrl }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || `Prediction failed (${res.status})`);
  }
  const data = (await res.json()) as {
    letter?: string;
    confidence?: number;
    top3?: unknown;
  };

  const top3Raw = Array.isArray(data.top3) ? data.top3 : [];
  const top3: { letter: string; confidence: number }[] = top3Raw.map((item: unknown) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const rec = item as Record<string, number>;
      const keys = Object.keys(rec);
      if (keys.length >= 1) {
        const k = keys[0];
        return { letter: String(k), confidence: Number(rec[k]) || 0 };
      }
    }
    return { letter: "?", confidence: 0 };
  });

  return {
    letter: String(data.letter ?? top3[0]?.letter ?? "?"),
    confidence: typeof data.confidence === "number" ? data.confidence : top3[0]?.confidence ?? 0,
    top3,
  };
}

/** Normalize model output to A–Z or null (ignore del/space for letter quiz). */
export function normalizeAlphabetPrediction(raw: string): string | null {
  const s = String(raw || "").trim().toUpperCase();
  if (s === "DEL" || s === "SPACE") return null;
  if (s.length === 1 && s >= "A" && s <= "Z") return s;
  const m = s.match(/[A-Z]/);
  return m && m[0] >= "A" && m[0] <= "Z" ? m[0] : null;
}

export async function verifyAlphabetSnapshot(
  frameDataUrl: string,
  expectedLetter: string,
  minConfidence = 0.12,
): Promise<{ correct: boolean; detectedLetter: string; confidence: number; message: string }> {
  const pred = await predictAlphabetFromFrame(frameDataUrl);
  const expected = expectedLetter.trim().toUpperCase();
  const detectedNorm = normalizeAlphabetPrediction(pred.letter);
  const detectedDisplay = pred.letter?.trim() || "?";

  if (detectedNorm === null) {
    return {
      correct: false,
      detectedLetter: detectedDisplay,
      confidence: pred.confidence,
      message: `Could not read a clear letter (got "${detectedDisplay}"). Try again with a clearer pose and lighting.`,
    };
  }

  if (pred.confidence < minConfidence) {
    return {
      correct: false,
      detectedLetter: detectedNorm,
      confidence: pred.confidence,
      message: `Unclear (${Math.round(pred.confidence * 100)}% confidence). Hold the sign steady and capture again.`,
    };
  }

  const correct = detectedNorm === expected;
  return {
    correct,
    detectedLetter: detectedNorm,
    confidence: pred.confidence,
    message: correct
      ? `Correct! Detected "${detectedNorm}" (${Math.round(pred.confidence * 100)}% confidence).`
      : `Incorrect. Detected "${detectedNorm}" instead of "${expected}".`,
  };
}

export async function verifySignSentence(
  frames: string[],
  expectedWords: string[],
): Promise<{ correct: boolean; detectedWords: string[]; matchCount: number; totalExpected: number; confidence: number }> {
  const res = await fetch(`${API_BASE}/api/sign-to-sentence`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ frames, language: "en" }),
  });
  if (!res.ok) throw new Error("Failed to verify sentence");
  const data = await res.json();

  if (data.no_sign_detected) {
    return { correct: false, detectedWords: [], matchCount: 0, totalExpected: expectedWords.length, confidence: 0 };
  }

  const detectedWords = (data.words || []).map((w: { sign: string }) => w.sign.toLowerCase());
  const expected = expectedWords.map((w) => w.toLowerCase());

  let matchCount = 0;
  const usedIndices = new Set<number>();
  for (const ew of expected) {
    const idx = detectedWords.findIndex((d: string, i: number) => d === ew && !usedIndices.has(i));
    if (idx >= 0) {
      matchCount++;
      usedIndices.add(idx);
    }
  }

  const correct = matchCount >= expected.length * 0.7;

  return {
    correct,
    detectedWords,
    matchCount,
    totalExpected: expected.length,
    confidence: data.confidence || 0,
  };
}

export function getAlphabetImageUrl(letter: string): string {
  return `${LEARNING_API_BASE}/api/learning/alphabet/image/${letter.toUpperCase()}`;
}

export function getAlphabetImageUrlFallback(letter: string): string {
  return `https://asl-hands.s3.amazonaws.com/${letter.toUpperCase()}.png`;
}
