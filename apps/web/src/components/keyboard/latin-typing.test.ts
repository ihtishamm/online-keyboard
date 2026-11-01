import { describe, expect, it } from "vitest";
import { NNBSP, frenchSpacing, spanishOpening, type Edit } from "./latin-typing";

/** Apply the rule's edit to `text` typed so far (the caret at the end). */
function after(rule: (text: string, caret: number) => Edit | null, text: string): string {
  const edit = rule(text, text.length);
  return edit ? text.slice(0, edit.start) + edit.text + text.slice(edit.end) : text;
}

describe("French spacing", () => {
  it.each([
    ["Quoi?", `Quoi${NNBSP}?`],
    ["Quoi ?", `Quoi${NNBSP}?`],
    ["Attention:", `Attention${NNBSP}:`],
    ["Oui;", `Oui${NNBSP};`],
    ["«", `«${NNBSP}`],
    [`«${NNBSP}Bonjour»`, `«${NNBSP}Bonjour${NNBSP}»`],
  ])("%s → %s", (typed, expected) => {
    expect(after(frenchSpacing, typed)).toBe(expected);
  });

  it.each([
    ["at 10:", "a time"],
    ["Quoi?!", "a repeated mark"],
    ["?", "the start of the text"],
    ["ligne\n?", "the start of a line"],
    [`Quoi${NNBSP}?`, "an existing space"],
    ["Quoi", "a letter"],
  ])("leaves %j alone (%s)", (typed) => {
    expect(frenchSpacing(typed, typed.length)).toBeNull();
  });

  it("leaves links alone", () => {
    expect(frenchSpacing("https://x", 6)).toBeNull();
  });
});

describe("Spanish opening marks", () => {
  it.each([
    ["hola como estas?", "¿hola como estas?"],
    ["Bien. que tal?", "Bien. ¿que tal?"],
    ["que bien!", "¡que bien!"],
    ['"donde?', '"¿donde?'],
    ["Hola.\nvienes?", "Hola.\n¿vienes?"],
  ])("%s → %s", (typed, expected) => {
    expect(after(spanishOpening, typed)).toBe(expected);
  });

  it.each(["¿ya?", "que??", "¿que?!", "?", "123?", "hola"])("leaves %j alone", (typed) => {
    expect(spanishOpening(typed, typed.length)).toBeNull();
  });
});
