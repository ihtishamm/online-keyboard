import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    expect(screen.getByRole("button", { name: "ب, B key" })).toBe(keyButton("KeyB"));
    tap(screen.getAllByRole("button", { name: "Shift" })[0]!);
    expect(screen.getByRole("button", { name: "zabar, Y key" })).toBe(keyButton("KeyY"));
  });
});

describe("toolbar", () => {
  const renderApp = () =>
    render(<KeyboardApp slug="urdu" layoutId="ur-phonetic" explicitLayout={false} />);

  it("copies the text to the clipboard and says so", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderApp();
    press("KeyS");
    press("KeyL");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    });
    expect(writeText).toHaveBeenCalledWith("سل");
    expect(await screen.findByText("Copied to clipboard")).toBeTruthy();
  });

  it("clears the text", () => {
    renderApp();
    press("KeyS");
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(editor().value).toBe("");
  });

  it("switches font and size, and remembers both", () => {
    renderApp();
    expect(editor().className).toContain("font-nastaliq");
    fireEvent.change(screen.getByRole("combobox", { name: "Font" }), {
      target: { value: "naskh" },
    });
    expect(editor().className).toContain("font-naskh");
    fireEvent.click(screen.getByRole("button", { name: "Larger text" }));
    expect(editor().style.fontSize).toBe("32px");
    expect(localStorage.getItem("likho:font:urdu")).toBe("naskh");
    expect(localStorage.getItem("likho:fontSize")).toBe("32");
  });

  it("counts words and characters", () => {
    renderApp();
    for (const code of ["KeyS", "KeyL", "KeyA", "KeyM"]) press(code);
    expect(screen.getByText(/1 word · 4 characters/)).toBeTruthy();
  });
});

describe("autosave", () => {
  it("restores the text after a reload", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(<KeyboardApp slug="urdu" layoutId="ur-phonetic" explicitLayout={false} />);
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      for (const code of ["KeyS", "KeyL", "KeyA", "KeyM"]) press(code);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(await screen.findByText("Saved on this device")).toBeTruthy();
      cleanup();

      render(<KeyboardApp slug="urdu" layoutId="ur-phonetic" explicitLayout={false} />);
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      expect(editor().value).toBe("سلام");
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps several drafts", async () => {
    render(<KeyboardApp slug="urdu" layoutId="ur-phonetic" explicitLayout={false} />);
    const draftSelect = await screen.findByRole("combobox", { name: "Draft" });
    press("KeyS");
    fireEvent.click(screen.getByRole("button", { name: "New draft" }));
    await waitFor(() => expect(draftSelect.querySelectorAll("option")).toHaveLength(2));
    expect(editor().value).toBe("");
    press("KeyM");
    const first = [...draftSelect.querySelectorAll("option")].find((o) => o.textContent === "س")!;
    fireEvent.change(draftSelect, { target: { value: first.getAttribute("value") } });
    await waitFor(() => expect(editor().value).toBe("س"));
  });
});
