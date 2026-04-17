import { describe, expect, it } from "vitest";
import { capitalizeFirstAlphabetic, DEFAULT_NSOR_OPTIONS, refineNonSemantic } from "./nsor";

describe("capitalizeFirstAlphabetic", () => {
  it("capitalizes first letter", () => {
    expect(capitalizeFirstAlphabetic("hello")).toBe("Hello");
  });
  it("ignores leading non-letters", () => {
    expect(capitalizeFirstAlphabetic("  hello")).toBe("  Hello");
  });
  it("no-op when no letters", () => {
    expect(capitalizeFirstAlphabetic("123")).toBe("123");
  });
});

describe("refineNonSemantic", () => {
  it("returns empty for empty input", () => {
    const r = refineNonSemantic("", DEFAULT_NSOR_OPTIONS);
    expect(r.display).toBe("");
    expect(r.changed).toBe(false);
  });

  it("trims and collapses spaces", () => {
    const r = refineNonSemantic("  need   water  ", DEFAULT_NSOR_OPTIONS);
    expect(r.display).toBe("Need water.");
    expect(r.changed).toBe(true);
  });

  it("does not add period when already present", () => {
    const r = refineNonSemantic("Hello.", DEFAULT_NSOR_OPTIONS);
    expect(r.display).toBe("Hello.");
  });

  it("terminal none skips punctuation", () => {
    const r = refineNonSemantic("hello", { ...DEFAULT_NSOR_OPTIONS, terminal: "none" });
    expect(r.display).toBe("Hello");
  });

  it("terminal question", () => {
    const r = refineNonSemantic("where", { ...DEFAULT_NSOR_OPTIONS, terminal: "question" });
    expect(r.display).toBe("Where?");
  });

  it("terminal exclamation", () => {
    const r = refineNonSemantic("stop", { ...DEFAULT_NSOR_OPTIONS, terminal: "exclamation" });
    expect(r.display).toBe("Stop!");
  });
});
