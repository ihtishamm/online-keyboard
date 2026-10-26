import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import KeyboardApp from "./KeyboardApp";

const editor = () => screen.getByRole<HTMLTextAreaElement>("textbox");

function press(code: string, opts: { shiftKey?: boolean; key?: string; ctrlKey?: boolean } = {}) {
  const el = editor();
  fireEvent.keyDown(el, { code, key: opts.key ?? "x", ...opts });
  fireEvent.keyUp(el, { code, key: opts.key ?? "x", ...opts });
}

/** Tap an on-screen key the way a pointer does: down, then up. */
function tap(button: HTMLElement) {
  fireEvent.pointerDown(button, { pointerId: 1 });
  fireEvent.pointerUp(button, { pointerId: 1 });
}

const keyButton = (code: string) =>
  document.querySelector<HTMLButtonElement>(`button[data-key="${code}"]`)!;

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/urdu");
});
afterEach(cleanup);

describe("KeyboardApp", () => {
  it("types Urdu from physical keys on the phonetic layout", () => {
    render(<KeyboardApp slug="urdu" layoutId="ur-phonetic" explicitLayout={false} />);
    for (const code of ["KeyP", "KeyA", "KeyK", "KeyS", "KeyT", "KeyA", "KeyN"]) press(code);
    expect(editor().value).toBe("پاکستان");
    expect(editor().dir).toBe("rtl");
    expect(editor().lang).toBe("ur");
  });

  it("uses the shift layer when Shift is held", () => {
    render(<KeyboardApp slug="urdu" layoutId="ur-phonetic" explicitLayout={false} />);
    press("KeyT", { shiftKey: true });
    expect(editor().value).toBe("ٹ");
  });

  it("lets Ctrl shortcuts through untouched", () => {
    render(<KeyboardApp slug="urdu" layoutId="ur-phonetic" explicitLayout={false} />);
    press("KeyA", { ctrlKey: true });
    expect(editor().value).toBe("");
  });

  it("switches to English typing with Esc", () => {
    render(<KeyboardApp slug="urdu" layoutId="ur-phonetic" explicitLayout={false} />);
    press("Escape", { key: "Escape" });
    press("KeyA");
    // Not intercepted: the browser would type "a" natively, so nothing is inserted by us.
    expect(editor().value).toBe("");
    expect(screen.getByText(/English typing ·/)).toBeTruthy();
  });

  it("switches layouts and remembers the choice", () => {
    render(<KeyboardApp slug="urdu" layoutId="ur-phonetic" explicitLayout={false} />);
    fireEvent.click(screen.getByRole("radio", { name: /Standard/ }));
    expect(location.pathname).toBe("/urdu/standard");
    press("KeyJ");
    expect(editor().value).toBe("ا");
    expect(localStorage.getItem("likho:layout:urdu")).toBe("ur-standard");
  });

  it("restores the saved layout on the main page but not on a layout page", () => {
    localStorage.setItem("likho:layout:urdu", "ur-standard");
    render(<KeyboardApp slug="urdu" layoutId="ur-phonetic" explicitLayout={false} />);
    expect(screen.getByRole("radio", { name: /Standard/ }).getAttribute("aria-checked")).toBe(
      "true",
    );
    cleanup();
    render(<KeyboardApp slug="urdu" layoutId="ur-phonetic" explicitLayout={true} />);
    expect(screen.getByRole("radio", { name: /Phonetic/ }).getAttribute("aria-checked")).toBe(
      "true",
    );
  });

  it("types from on-screen keys and applies one-shot Shift", () => {
    render(<KeyboardApp slug="urdu" layoutId="ur-phonetic" explicitLayout={false} />);
    tap(keyButton("KeyB"));
    tap(screen.getAllByRole("button", { name: "Shift" })[0]!);
    tap(keyButton("KeyT"));
    tap(keyButton("KeyT"));
    expect(editor().value).toBe("بٹت");
  });

  it("shows long-press alternates and inserts the chosen one", () => {
    vi.useFakeTimers();
    try {
      render(<KeyboardApp slug="urdu" layoutId="ur-phonetic" explicitLayout={false} />);
      fireEvent.pointerDown(keyButton("KeyA"), { pointerId: 1 });
      act(() => vi.advanceTimersByTime(500));
      fireEvent.pointerUp(keyButton("KeyA"), { pointerId: 1 });
      expect(editor().value).toBe(""); // a long press does not type the base letter
      fireEvent.click(screen.getByRole("menuitem", { name: "آ" }));
      expect(editor().value).toBe("آ");
      expect(screen.queryByRole("menu")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("deletes with the on-screen backspace", () => {
    render(<KeyboardApp slug="urdu" layoutId="ur-phonetic" explicitLayout={false} />);
    tap(keyButton("KeyS"));
    tap(keyButton("KeyL"));
    tap(screen.getAllByRole("button", { name: "Backspace" })[0]!);
    expect(editor().value).toBe("س");
  });

  it("labels keys with their character and Latin position", () => {
    render(<KeyboardApp slug="urdu" layoutId="ur-phonetic" explicitLayout={false} />);
    expect(keyButton("KeyB").getAttribute("aria-label")).toBe("ب, B key");
    tap(screen.getAllByRole("button", { name: "Shift" })[0]!);
    expect(keyButton("KeyY").getAttribute("aria-label")).toBe("zabar, Y key");
  });
});
