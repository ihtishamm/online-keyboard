import { createStore, get, set, type UseStore } from "idb-keyval";

/** One saved document. Drafts live only in this browser (IndexedDB). */
export interface Draft {
  id: string;
  text: string;
  updatedAt: number;
}

export const MAX_DRAFTS = 50;

let store: UseStore | null = null;
function db(): UseStore | null {
  if (typeof indexedDB === "undefined") return null;
  store ??= createStore("likho", "drafts");
  return store;
}

/** Tests swap in a fresh IndexedDB between cases; drop the cached handle to the old one. */
export function resetDraftStore(): void {
  store = null;
}

const listKey = (slug: string) => `drafts:${slug}`;
const currentKey = (slug: string) => `current:${slug}`;

export function newDraft(text = ""): Draft {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { id, text, updatedAt: Date.now() };
}

/** First line of a draft, shortened, for menus. */
export function draftTitle(draft: Draft, fallback = "Untitled"): string {
  const first = draft.text.trim().split("\n")[0]?.trim() ?? "";
  if (!first) return fallback;
  const chars = [...first];
  return chars.length > 32 ? chars.slice(0, 32).join("") + "…" : first;
}

export interface DraftState {
  drafts: Draft[];
  currentId: string;
}

/** Load drafts for a language, creating the first one if needed. Newest first. */
export async function loadDrafts(slug: string): Promise<DraftState> {
  const s = db();
  let drafts: Draft[] = [];
  let currentId: string | undefined;
  if (s) {
    try {
      drafts = (await get<Draft[]>(listKey(slug), s)) ?? [];
      currentId = await get<string>(currentKey(slug), s);
    } catch {
      drafts = [];
    }
  }
  if (drafts.length === 0) drafts = [newDraft()];
  drafts.sort((a, b) => b.updatedAt - a.updatedAt);
  if (!currentId || !drafts.some((d) => d.id === currentId)) currentId = drafts[0]!.id;
  return { drafts, currentId };
}

export async function saveDrafts(slug: string, state: DraftState): Promise<void> {
  const s = db();
  if (!s) return;
  const drafts = [...state.drafts].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_DRAFTS);
  try {
    await set(listKey(slug), drafts, s);
    await set(currentKey(slug), state.currentId, s);
  } catch {
    /* quota or private mode: drafts last for this session only */
  }
}

/** Pure helpers so the hook stays small and testable. */
export function updateText(state: DraftState, text: string, now = Date.now()): DraftState {
  return {
    ...state,
    drafts: state.drafts.map((d) =>
      d.id === state.currentId ? { ...d, text, updatedAt: now } : d,
    ),
  };
}

export function addDraft(state: DraftState): DraftState {
  const d = newDraft();
  return { drafts: [d, ...state.drafts].slice(0, MAX_DRAFTS), currentId: d.id };
}

export function removeDraft(state: DraftState, id: string): DraftState {
  const drafts = state.drafts.filter((d) => d.id !== id);
  if (drafts.length === 0) {
    const d = newDraft();
    return { drafts: [d], currentId: d.id };
  }
  const currentId = state.currentId === id ? drafts[0]!.id : state.currentId;
  return { drafts, currentId };
}

export function currentDraft(state: DraftState): Draft {
  return state.drafts.find((d) => d.id === state.currentId) ?? state.drafts[0]!;
}
