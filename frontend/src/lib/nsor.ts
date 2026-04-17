/**
 * Non-Semantic Output Refiner (NSOR)
 * Deterministic surface-only rules on classifier English — no token swaps, no ML.
 */

export type TerminalPunctuation = "auto" | "period" | "question" | "exclamation" | "none";

export type NsorOptions = {
  capitalizeFirst: boolean;
  terminal: TerminalPunctuation;
  collapseWhitespace: boolean;
  trim: boolean;
};

export type NsorResult = {
  display: string;
  /** True if any allow-listed transform altered the string */
  changed: boolean;
};

export const DEFAULT_NSOR_OPTIONS: NsorOptions = {
  capitalizeFirst: true,
  terminal: "auto",
  collapseWhitespace: true,
  trim: true,
};

function mergeOptions(partial?: Partial<NsorOptions>): NsorOptions {
  return { ...DEFAULT_NSOR_OPTIONS, ...partial };
}

/** Uppercase the first alphabetic character; leave all other characters unchanged. */
export function capitalizeFirstAlphabetic(s: string): string {
  const i = s.search(/[a-zA-Z]/);
  if (i === -1) return s;
  const ch = s.charAt(i);
  const up = ch.toUpperCase();
  if (ch === up) return s;
  return s.slice(0, i) + up + s.slice(i + 1);
}

/** Strip trailing . ? ! for forced terminal modes, then append the chosen mark. */
function applyTerminal(s: string, mode: TerminalPunctuation): string {
  if (!s || mode === "none") return s;

  const trimmedEnd = s.replace(/\s+$/, "");
  if (mode === "auto") {
    if (/[.!?]$/.test(trimmedEnd)) return s;
    return trimmedEnd + ".";
  }

  const base = trimmedEnd.replace(/[.!?]+$/, "").replace(/\s+$/, "");
  if (!base) return s;

  if (mode === "period") return base + ".";
  if (mode === "question") return base + "?";
  if (mode === "exclamation") return base + "!";
  return s;
}

/**
 * Apply only allow-listed transforms. Safe to run on every API `translation` / `sentence`.
 */
export function refineNonSemantic(
  text: string,
  partialOptions?: Partial<NsorOptions>,
): NsorResult {
  const o = mergeOptions(partialOptions);
  const input = text ?? "";
  let s = input;
  let changed = false;

  if (o.trim) {
    const t = s.trim();
    if (t !== s) changed = true;
    s = t;
  }

  if (o.collapseWhitespace) {
    const t = s.replace(/\s+/g, " ");
    if (t !== s) changed = true;
    s = t;
  }

  if (o.capitalizeFirst) {
    const t = capitalizeFirstAlphabetic(s);
    if (t !== s) changed = true;
    s = t;
  }

  const beforeTerminal = s;
  s = applyTerminal(s, o.terminal);
  if (s !== beforeTerminal) changed = true;

  if (s !== input) changed = true;

  return { display: s, changed };
}
