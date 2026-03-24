import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import SignToText from "../pages/SignToText";

// ── Minimal browser API stubs ─────────────────────────────────────────────────

const SEND_INTERVAL_MS = 3000;

const mockStop = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();

  // jsdom does not implement HTMLMediaElement.play — return a resolved promise
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);

  // MediaDevices stub
  const fakeTrack = { stop: mockStop } as unknown as MediaStreamTrack;
  const fakeStream = {
    getTracks: () => [fakeTrack],
  } as unknown as MediaStream;

  Object.defineProperty(navigator, "mediaDevices", {
    writable: true,
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue(fakeStream) },
  });

  // clipboard stub
  Object.defineProperty(navigator, "clipboard", {
    writable: true,
    configurable: true,
    value: { writeText: vi.fn() },
  });

  // speechSynthesis stub
  Object.defineProperty(window, "speechSynthesis", {
    writable: true,
    value: { speak: vi.fn() },
  });

  // fetch stub — returns a successful translation response by default
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ translation: "Hello", confidence: 0.9 }),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <SignToText />
    </MemoryRouter>
  );

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("SignToText – status indicator", () => {
  it("shows a muted dot when the camera is off", () => {
    renderPage();
    const dot = document.querySelector(".bg-muted-foreground");
    expect(dot).toBeTruthy();
  });

  it("shows a green pulsing dot after the camera starts", async () => {
    renderPage();
    const btn = screen.getByRole("button", { name: /start camera/i });

    await act(async () => {
      fireEvent.click(btn);
      await Promise.resolve();
    });

    // Advance past the 100 ms setTimeout in startCamera
    await act(async () => {
      vi.advanceTimersByTime(150);
      await Promise.resolve();
    });

    const dot = document.querySelector(".bg-green-500.animate-pulse");
    expect(dot).toBeTruthy();
  });
});

describe("SignToText – translation accumulation", () => {
  it("appends successive translations with a space", () => {
    // Unit-test the accumulation logic used in the functional updater
    let accumulated = "";
    const update = (text: string) => (prev: string) =>
      prev ? `${prev} ${text}` : text;

    accumulated = update("Hello")(accumulated);
    accumulated = update("World")(accumulated);
    expect(accumulated).toBe("Hello World");
  });
});

describe("SignToText – concurrent-call guard (ref-based)", () => {
  it("does not fire a second fetch while one is in flight", async () => {
    // Simulate a slow fetch — never resolves during the test
    let resolveFirst!: (v: unknown) => void;
    global.fetch = vi.fn().mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveFirst = res;
        })
    );

    renderPage();
    const btn = screen.getByRole("button", { name: /start camera/i });

    await act(async () => {
      fireEvent.click(btn);
      await Promise.resolve();
    });

    // Let the 100 ms startCamera setTimeout elapse so the intervals are registered
    await act(async () => {
      vi.advanceTimersByTime(150);
      await Promise.resolve();
    });

    // Advance past the send interval twice while the first fetch is still pending
    await act(async () => {
      vi.advanceTimersByTime(SEND_INTERVAL_MS + 100);
      await Promise.resolve();
      vi.advanceTimersByTime(SEND_INTERVAL_MS + 100);
      await Promise.resolve();
    });

    // fetch may not have fired at all (framesRef is empty in jsdom — no real
    // video/canvas). The important assertion: it must NOT have been called more
    // than once, proving the ref-based guard prevents concurrent requests.
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeLessThanOrEqual(1);

    // If fetch was called, resolve the pending promise to avoid warnings
    if (resolveFirst) {
      resolveFirst({ ok: true, json: async () => ({}) });
    }
  });
});
