import { IDBFactory } from "fake-indexeddb";
import { beforeEach } from "vitest";
import { resetDraftStore } from "./components/keyboard/drafts";

// Every test gets an empty IndexedDB.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDraftStore();
});
