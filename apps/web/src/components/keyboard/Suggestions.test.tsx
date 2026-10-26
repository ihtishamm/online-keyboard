import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import KeyboardApp from "./KeyboardApp";

vi.mock("./dictionary", async () => {
  const { Lexicon, NextWords } = await import("@okb/engine");
  const words = [
    ...["میں", "نے", "ہے", "کیا", "حال", "میرا", "نام", "پاکستان", "پاکستانی", "پاک"],
    ...["کی", "ضرورت", "حکومت"],
  ];
  const dictionary = {
    lexicon: Lexicon.fromRanked(words),
    next: NextWords.parse("^\t0 2\n0\t1 2\n", words),
  };
  return { hasDictionary: () => true, loadDictionary: () => Promise.resolve(dictionary) };
});

const editor = () => screen.getByRole<HTMLTextAreaElement>("textbox");

function press(code: string, key = "x") {
  fireEvent.keyDown(editor(), { code, key });
  fireEvent.keyUp(editor(), { code, key });
}

/** Type Latin letters on the Roman layout, one key per letter. */
function typeRoman(word: string) {
  for (const c of word) press(`Key${c.toUpperCase()}`, c);
}

const bar = (name: RegExp) => screen.getByRole("group", { name });

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/urdu/roman");
});
afterEach(cleanup);

describe("Roman mode", () => {
  const renderRoman = () =>
    render(<KeyboardApp slug="urdu" layoutId="ur-roman" explicitLayout={true} />);

  it("converts each word on Space, ranked by the dictionary", async () => {
    renderRoman();
    typeRoman("kya");
    press("Space", " ");
    // The word list loads on the first key. Rules alone would spell "haal" as ہال.
    typeRoman("haal");
    await waitFor(() => {
      const first = within(bar(/Urdu spellings/)).getAllByRole("button")[0]!;
      expect(first.textContent).toContain("حال");
    });
    press("Space", " ");
    for (const word of ["hai"]) {
      typeRoman(word);
      press("Space", " ");
    }
    expect(editor().value).toBe("کیا حال ہے ");
  });

  it("converts punctuation and the word before it, but not decimal points", () => {
    renderRoman();
    typeRoman("hai");
    press("Slash", "?"); // Slash without Shift types "/" on QWERTY
    fireEvent.keyDown(editor(), { code: "Slash", key: "?", shiftKey: true });
    expect(editor().value).toBe("ہے/؟");
    editor().value = "";
    press("Digit3", "3");
    press("Period", ".");
    press("Digit5", "5");
    expect(editor().value).toBe("3.5");
  });

  it("picks another spelling with a number key", () => {
    renderRoman();
    typeRoman("he");
    const buttons = within(bar(/Urdu spellings/)).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining("ہی")]),
    );
    press("Digit2", "2");
    expect(editor().value).toBe("ہی ");
  });

  it("keeps a word in English with Esc", async () => {
    renderRoman();
    typeRoman("ok");
    press("Escape", "Escape");
    expect(editor().value).toBe("ok ");
    expect(await screen.findByText("Kept as typed")).toBeTruthy();
  });

  it("converts after a phone keyboard types a space", () => {
    render(<KeyboardApp slug="urdu" layoutId="ur-roman" explicitLayout={true} />);
    const el = editor();
    el.value = "mera ";
    el.setSelectionRange(5, 5);
    fireEvent.input(el, { inputType: "insertText", data: " " });
    expect(el.value).toBe("میرا ");
  });

  it("leaves words alone after switching to English", () => {
    renderRoman();
    fireEvent.click(screen.getByRole("button", { name: /switch to English/ }));
    const el = editor();
    el.value = "ok";
    el.setSelectionRange(2, 2);
    press("Space", " ");
    // Space is not intercepted: the browser types it, and nothing is converted.
    expect(el.value).toBe("ok");
  });
});

describe("word suggestions", () => {
  const renderPhonetic = () =>
    render(<KeyboardApp slug="urdu" layoutId="ur-phonetic" explicitLayout={false} />);

  it("completes the word being typed", async () => {
    renderPhonetic();
    for (const code of ["KeyP", "KeyA", "KeyK"]) press(code);
    const suggestion = await screen.findByRole("button", { name: "پاکستان" });
    fireEvent.click(suggestion);
    expect(editor().value).toBe("پاکستان ");
  });

  it("suggests the next word after a space", async () => {
    renderPhonetic();
    press("KeyM"); // first key: loads the word list
    const el = editor();
    el.value = "میں ";
    el.setSelectionRange(4, 4);
    fireEvent.select(el);
    const group = await waitFor(() => {
      const g = bar(/Word suggestions/);
      expect(within(g).queryByText("نے")).toBeTruthy();
      return g;
    });
    fireEvent.click(within(group).getByText("نے"));
    expect(el.value).toBe("میں نے ");
  });

  it("can be turned off, and remembers it", async () => {
    renderPhonetic();
    fireEvent.click(screen.getByRole("button", { name: "Word suggestions" }));
    expect(localStorage.getItem("likho:predict")).toBe("off");
    for (const code of ["KeyP", "KeyA", "KeyK"]) press(code);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole("button", { name: "پاکستان" })).toBeNull();
    expect(screen.getByText("Word suggestions are off.")).toBeTruthy();
  });
});

describe("spell check", () => {
  const renderPhonetic = () =>
    render(<KeyboardApp slug="urdu" layoutId="ur-phonetic" explicitLayout={false} />);

  /** Put `text` in the editor as if typed, with the caret at `caret` (default: the end). */
  function setText(text: string, caret = text.length) {
    const el = editor();
    el.value = text;
    el.setSelectionRange(caret, caret);
    fireEvent.input(el);
  }

  const count = () => screen.queryByRole("button", { name: /possible misspelling/ });

  it("underlines misspelled words once the word list loads", async () => {
    const { container } = renderPhonetic();
    setText("میرا نام زرورت ہے ");
    await waitFor(() => expect(count()?.textContent).toBe("1 possible misspelling"));
    const marked = container.querySelectorAll(".spell-error");
    expect([...marked].map((m) => m.textContent)).toEqual(["زرورت"]);
  });

  it("underlines the word being typed only once the caret leaves it", async () => {
    renderPhonetic();
    setText("میرا نام زرورت");
    await waitFor(() => bar(/Spelling corrections/));
    expect(count()).toBeNull();
    editor().setSelectionRange(0, 0);
    fireEvent.select(editor());
    await waitFor(() => expect(count()?.textContent).toBe("1 possible misspelling"));
  });

  it("offers corrections for the word at the caret and replaces it", async () => {
    renderPhonetic();
    setText("زرورت ہے", 2);
    const group = await waitFor(() => bar(/Spelling corrections/));
    fireEvent.click(within(group).getByRole("button", { name: "ضرورت" }));
    expect(editor().value).toBe("ضرورت ہے");
    await waitFor(() => expect(count()).toBeNull());
  });

  it("jumps to the next misspelling", async () => {
    renderPhonetic();
    setText("ہکومت کی زرورت ہے", 0);
    await waitFor(() => expect(count()?.textContent).toBe("2 possible misspellings"));
    fireEvent.click(count()!);
    expect(editor().selectionStart).toBe(5); // after ہکومت
    expect(within(bar(/Spelling corrections/)).getByRole("button", { name: "حکومت" })).toBeTruthy();
  });

  it("ignores a word, or adds it to the user's dictionary", async () => {
    renderPhonetic();
    setText("لکھو ہے زرورت ہے", 1);
    const ignore = await screen.findByRole("button", { name: /Ignore/ });
    fireEvent.click(ignore);
    await waitFor(() => expect(count()?.textContent).toBe("1 possible misspelling"));

    editor().setSelectionRange(10, 10);
    fireEvent.select(editor());
    fireEvent.click(await screen.findByRole("button", { name: /to my dictionary/ }));
    await waitFor(() => expect(count()).toBeNull());
    expect(JSON.parse(localStorage.getItem("likho:spelling:urdu")!)).toEqual(["زرورت"]);
  });

  it("can be turned off, and remembers it", async () => {
    renderPhonetic();
    setText("زرورت ہے ");
    await waitFor(() => expect(count()).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Spell check" }));
    expect(localStorage.getItem("likho:spellcheck")).toBe("off");
    await waitFor(() => expect(count()).toBeNull());
  });
});
