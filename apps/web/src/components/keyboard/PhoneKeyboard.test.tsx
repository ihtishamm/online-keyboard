import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { languageBundle } from "@okb/layouts";
import KeyboardApp from "./KeyboardApp";

/** Pretend to be a phone: narrow screen with a touch pointer. */
function phoneScreen() {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: query.includes("max-width") || query.includes("coarse"),
        media: query,
        addEventListener() {},
        removeEventListener() {},
      }) as unknown as MediaQueryList,
  );
}

const editor = () => screen.getByRole<HTMLTextAreaElement>("textbox");
const key = (code: string) =>
  document.querySelector<HTMLButtonElement>(`button[data-key="${code}"]`)!;

function tap(button: HTMLElement) {
  fireEvent.pointerDown(button, { pointerId: 1, clientX: 100 });
  fireEvent.pointerUp(button, { pointerId: 1, clientX: 100 });
}

/** Press, slide horizontally by `dx`, release. */
function slide(button: HTMLElement, dx: number) {
  fireEvent.pointerDown(button, { pointerId: 1, clientX: 200 });
  for (let x = 0; x !== dx; x += Math.sign(dx) * 5) {
    fireEvent.pointerMove(button, { pointerId: 1, clientX: 200 + x });
  }
  fireEvent.pointerMove(button, { pointerId: 1, clientX: 200 + dx });
  fireEvent.pointerUp(button, { pointerId: 1, clientX: 200 + dx });
}

function renderUrdu() {
  render(<KeyboardApp bundle={languageBundle("urdu")} layoutId="ur-phonetic" explicitLayout />);
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("likho:phoneKeyboard", "off");
  history.replaceState(null, "", "/urdu");
  phoneScreen();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("phone keyboard", () => {
  it("shows three letter rows without the number row", () => {
    renderUrdu();
    const keyboard = screen.getByRole("group", { name: "On-screen keyboard" });
    expect(keyboard.dataset.phone).toBe("true");
    expect(key("KeyQ")).toBeTruthy();
    expect(key("Digit1")).toBeNull();
    tap(key("KeyQ"));
    expect(editor().value).toBe("ق");
  });

  it("types the language's punctuation and digits from the symbols page", () => {
    renderUrdu();
    fireEvent.click(screen.getByRole("button", { name: "Numbers and symbols" }));
    tap(document.querySelector<HTMLButtonElement>('button[data-symbol="۱"]')!);
    tap(document.querySelector<HTMLButtonElement>('button[data-symbol="۔"]')!);
    expect(editor().value).toBe("۱۔");
    fireEvent.click(screen.getByRole("button", { name: "Letters" }));
    expect(key("KeyQ")).toBeTruthy();
  });

  it("applies the layout's rules to a symbol: pinyin ma then 3 is mǎ", () => {
    history.replaceState(null, "", "/pinyin-tones");
    render(
      <KeyboardApp bundle={languageBundle("pinyin-tones")} layoutId="py-tones" explicitLayout />,
    );
    tap(key("KeyM"));
    tap(key("KeyA"));
    fireEvent.click(screen.getByRole("button", { name: "Numbers and symbols" }));
    tap(document.querySelector<HTMLButtonElement>('button[data-symbol="3"]')!);
    expect(editor().value).toBe("mǎ");
    tap(document.querySelector<HTMLButtonElement>('button[data-symbol="3"]')!);
    expect(editor().value).toBe("mǎ3");
  });

  it("moves the caret when sliding on Space, without typing a space", () => {
    renderUrdu();
    const el = editor();
    el.focus();
    for (const c of ["KeyQ", "KeyW", "KeyE"]) tap(key(c));
    expect(el.value).toBe("قوع");
    // Right-to-left text: sliding left moves forward in the text, right moves back.
    slide(key("space"), 30);
    expect(el.selectionStart).toBe(1);
    expect(el.value).toBe("قوع");
  });

  it("selects words when sliding left from Backspace and deletes them on release", () => {
    renderUrdu();
    const el = editor();
    el.focus();
    el.value = "ایک دو تین";
    el.setSelectionRange(el.value.length, el.value.length);
    slide(key("backspace"), -70);
    expect(el.value).toBe("ایک ");
  });

  it("deletes whole words when Backspace is held", () => {
    vi.useFakeTimers();
    try {
      renderUrdu();
      const el = editor();
      el.focus();
      el.value = "ایک دو تین";
      el.setSelectionRange(el.value.length, el.value.length);
      fireEvent.pointerDown(key("backspace"), { pointerId: 1, clientX: 100 });
      act(() => vi.advanceTimersByTime(1500 + 230));
      fireEvent.pointerUp(key("backspace"), { pointerId: 1, clientX: 100 });
      // Characters first (repeat), then at least one whole word.
      expect(el.value.split(" ").length).toBeLessThanOrEqual(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("asks first-time phone visitors how they want to type, and remembers", () => {
    localStorage.removeItem("likho:phoneKeyboard");
    renderUrdu();
    fireEvent.click(screen.getByRole("button", { name: "Tap the keys below" }));
    expect(screen.queryByText("How would you like to type?")).toBeNull();
    expect(localStorage.getItem("likho:phoneKeyboard")).toBe("off");
  });

  it("keeps keyboard settings from the More sheet", () => {
    renderUrdu();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(screen.getByRole("button", { name: "L" }));
    fireEvent.click(screen.getByRole("switch", { name: "Large letters" }));
    const saved = JSON.parse(localStorage.getItem("likho:keyboardSettings")!) as {
      height: string;
      largeLabels: boolean;
    };
    expect(saved).toMatchObject({ height: "l", largeLabels: true });
    expect(key("KeyQ").className).toContain("phone:h-14");
  });
});
