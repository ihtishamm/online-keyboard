import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { languageBundle } from "@okb/layouts";
import KeyboardApp from "./KeyboardApp";
import type { RecognitionResultEvent } from "./voice";

/** A stand-in for the browser's SpeechRecognition, driven by the test. */
class FakeRecognition {
  static last: FakeRecognition | null = null;
  static started = 0;
  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onresult: ((e: RecognitionResultEvent) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start() {
    FakeRecognition.last = this;
    FakeRecognition.started++;
  }
  stop() {
    this.onend?.();
  }
  abort() {
    this.onend?.();
  }
  /** Hear `text`; final unless `interim`. */
  hear(text: string, interim = false) {
    const result = Object.assign([{ transcript: text }], { isFinal: !interim });
    act(() => this.onresult?.({ resultIndex: 0, results: [result] }));
  }
}

const editor = () => screen.getByRole<HTMLTextAreaElement>("textbox");
const mic = () => screen.getByRole("button", { name: "Voice typing" });
const renderUrdu = () =>
  render(
    <KeyboardApp bundle={languageBundle("urdu")} layoutId="ur-phonetic" explicitLayout={false} />,
  );

beforeEach(() => {
  localStorage.clear();
  FakeRecognition.last = null;
  FakeRecognition.started = 0;
  (window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeRecognition;
});
afterEach(() => {
  cleanup();
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
});

describe("voice typing", () => {
  it("asks once before using the browser's speech service", () => {
    renderUrdu();
    fireEvent.click(mic());
    expect(screen.getByRole("heading", { name: "Voice typing" })).toBeTruthy();
    expect(screen.getByText(/send your voice to Google or Microsoft/)).toBeTruthy();
    expect(FakeRecognition.started).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "Start voice typing" }));
    expect(FakeRecognition.last?.lang).toBe("ur-PK");
    expect(localStorage.getItem("likho:voice")).toBe("on");
    expect(mic().getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(mic().getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(mic()); // no second notice
    expect(screen.queryByRole("heading", { name: "Voice typing" })).toBeNull();
    expect(FakeRecognition.started).toBe(2);
  });

  it("types what it hears at the cursor, with spoken punctuation", () => {
    localStorage.setItem("likho:voice", "on");
    renderUrdu();
    const el = editor();
    el.value = "سلام";
    el.setSelectionRange(4, 4);
    fireEvent.click(mic());
    const r = FakeRecognition.last!;
    r.hear("میرا نام", true);
    expect(screen.getByText("میرا نام")).toBeTruthy(); // interim, not typed yet
    expect(el.value).toBe("سلام");
    r.hear("میرا نام علی ہے فل سٹاپ");
    expect(el.value).toBe("سلام میرا نام علی ہے۔");
  });

  it("keeps listening when the browser ends a session by itself", () => {
    localStorage.setItem("likho:voice", "on");
    renderUrdu();
    fireEvent.click(mic());
    act(() => FakeRecognition.last!.onend?.());
    expect(FakeRecognition.started).toBe(2);
    expect(mic().getAttribute("aria-pressed")).toBe("true");
  });

  it("explains a blocked microphone", () => {
    localStorage.setItem("likho:voice", "on");
    renderUrdu();
    fireEvent.click(mic());
    const r = FakeRecognition.last!;
    act(() => {
      r.onerror?.({ error: "not-allowed" });
      r.onend?.();
    });
    expect(screen.getByRole("alert").textContent).toMatch(/Microphone access is blocked/);
    expect(mic().getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("is hidden where the browser cannot recognise speech", () => {
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    renderUrdu();
    expect(screen.queryByRole("button", { name: "Voice typing" })).toBeNull();
  });
});
