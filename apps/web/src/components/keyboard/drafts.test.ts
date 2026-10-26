import { describe, expect, it } from "vitest";
import { countText } from "./actions";
import {
  MAX_DRAFTS,
  addDraft,
  currentDraft,
  draftTitle,
  loadDrafts,
  newDraft,
  removeDraft,
  saveDrafts,
  updateText,
} from "./drafts";

describe("draft helpers", () => {
  it("titles drafts by their first line, shortened", () => {
    expect(draftTitle(newDraft(""))).toBe("Untitled");
    expect(draftTitle(newDraft("  \nسلام\nدوسری"))).toBe("سلام");
    const long = "ا".repeat(40);
    expect(draftTitle(newDraft(long))).toBe("ا".repeat(32) + "…");
  });

  it("updates only the current draft", () => {
    const a = newDraft("a");
    const b = newDraft("b");
    const next = updateText({ drafts: [a, b], currentId: b.id }, "bb", 5);
    expect(next.drafts[0]).toEqual(a);
    expect(next.drafts[1]).toMatchObject({ text: "bb", updatedAt: 5 });
  });

  it("adds new drafts at the front and caps the list", () => {
    let state = { drafts: [newDraft()], currentId: "" };
    for (let i = 0; i < MAX_DRAFTS + 5; i++) state = addDraft(state);
    expect(state.drafts).toHaveLength(MAX_DRAFTS);
    expect(state.currentId).toBe(state.drafts[0]!.id);
  });

  it("removing the last draft leaves an empty one", () => {
    const only = newDraft("x");
    const next = removeDraft({ drafts: [only], currentId: only.id }, only.id);
    expect(next.drafts).toHaveLength(1);
    expect(currentDraft(next).text).toBe("");
  });

  it("removing the current draft selects another", () => {
    const a = newDraft("a");
    const b = newDraft("b");
    const next = removeDraft({ drafts: [a, b], currentId: a.id }, a.id);
    expect(next.currentId).toBe(b.id);
  });
});

describe("draft persistence", () => {
  it("creates a first draft when none exist", async () => {
    const state = await loadDrafts("urdu");
    expect(state.drafts).toHaveLength(1);
    expect(state.currentId).toBe(state.drafts[0]!.id);
  });

  it("round-trips drafts per language", async () => {
    const first = await loadDrafts("urdu");
    await saveDrafts("urdu", updateText(first, "سلام"));
    const again = await loadDrafts("urdu");
    expect(currentDraft(again).text).toBe("سلام");
    const other = await loadDrafts("arabic");
    expect(currentDraft(other).text).toBe("");
  });
});

describe("countText", () => {
  it("counts words and non-space characters", () => {
    expect(countText("")).toEqual({ words: 0, chars: 0 });
    expect(countText("  اردو  ہماری\nزبان ")).toEqual({ words: 3, chars: 13 });
    expect(countText("👍🏽 ok")).toEqual({ words: 2, chars: 4 });
  });
});
