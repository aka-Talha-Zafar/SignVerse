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
